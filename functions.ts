import ReleaseTimeline from "main";
import { getAPI, isPluginEnabled, DataviewAPI } from "obsidian-dataview";
import { moment } from "obsidian";
import { create } from "domain";

export default class HelpFunctions {
    
    plugin: ReleaseTimeline;

    constructor(plugin: ReleaseTimeline) {
        this.plugin = plugin;
    }

    createErrorMsg(errorText) {
        const errorTbl = createEl("table", { cls: "release-timeline" } );
        const newI = createEl("i", {text: errorText})
        errorTbl.appendChild(newI);
    
        return errorTbl;
    };

    async renderTimeline(content: string) {

        const dv = getAPI();

        if ( typeof dv == 'undefined' ) { return this.createErrorMsg('Dataview is not installed. The Release Timeline plugin requires Dataview to properly function.'); }

        var sortOrder = this.parseQuerySortOrder(content);
        
        //get results from dataview
        try {
            
            var results;
            var results0 = await dv.query(content);
            let a = results0.value.values;
            
            //filter out null years
            let b = a.filter(x => typeof x[1] !== 'undefined' && x[1] !== null);

            //convert date values to years, get rid of non-date values like character strings
            b.forEach(x => x[1] = moment( x[1].toString(), 'Y' ).format('Y'))
            b = b.filter(x => x[1] != "Invalid date")

            //parse file name from path, replace path, insert to notes with empty alias
            b.forEach(x => x[0] = x[0].path.match(/([^\/]+(?=\.)).md/)[1]);
            b.forEach(x => x[2]==null ? x[2]=x[0] : 1);

            //group by year
            results = dv.array(b);
            results = results.groupBy(x => x[1]);

            //sort by sort order
            results = results.sort(k => k.key, sortOrder);

        }
        catch(error) {
            return this.createErrorMsg("Error from dataview: " + error.message)
        }

        if (results.length == 0) {
            return this.createErrorMsg("No results");
        }
        else {
            return this.createTimelineTable(results);
        }

    };

    async renderTimelineMonth(content: string) {
        
        const dv = getAPI();

        if ( typeof dv == 'undefined' ) { return this.createErrorMsg('Dataview is not installed. The Release Timeline plugin requires Dataview to properly function.'); }

        var sortOrder = this.parseQuerySortOrder(content);

        //get results from dataview
        try {
            
            var results;
            var results0 = await dv.query(content);
            let a = results0.value.values;
            
            //filter out null years
            let b = a.filter(x => typeof x[1] !== 'undefined' && x[1] !== null);
            //filter out years without a month
            b = b.filter(x => !(typeof(x[1]) == 'number') );

            //convert date values to years, get rid of non-date values like character strings
            b.forEach(x => x[1] = moment( x[1].toString() ).format('YYYY-MM'))
            b = b.filter(x => x[1] != "Invalid date")

            //parse file name from path, replace path, insert to notes with empty alias
            b.forEach(x => x[0] = x[0].path.match(/([^\/]+(?=\.)).md/)[1]);
            b.forEach(x => x[2]==null ? x[2]=x[0] : 1);

            //group by month
            let monthGroup = [];

            for(let i=0; i<b.length; i++) {

                let item = b[i][1];
                
                const ind = monthGroup.findIndex(e => e.yearMonth === item);
                if (ind > -1) {
                    monthGroup[ind].values.push([ b[i][0], b[i][2] ])
                }
                else {
                    monthGroup.push( {'yearMonth': item, 'values': [ [b[i][0], b[i][2]] ] } )
                }
            }
            
            //group by year
            let yearMonthGroup = [];

            for(let j=0; j<monthGroup.length; j++) {

                //let item = monthGroup[j].yearMonth.substring(0,4);
                let item = monthGroup[j].yearMonth.split('-')[0];

                const ind = yearMonthGroup.findIndex(e => e.year === item);
                if (ind > -1) {
                    yearMonthGroup[ind].months.push( monthGroup[j] )
                }
                else {
                    yearMonthGroup.push( {'year': item, 'months': [monthGroup[j]] } );
                }

            }

            results = sortOrder == 'asc' ? yearMonthGroup.sort((a, b) => Number(a.year) - Number(b.year)) : yearMonthGroup.sort((a, b) => Number(b.year) - Number(a.year));

        }
        catch(error) {
            return this.createErrorMsg("Error from dataview: " + error.message)
        }

        if (results.length == 0) {
            return this.createErrorMsg("No results");
        }
        else {
            return this.createTimelineTableMonth(results, sortOrder);
        }

    };

    createTimelineTableMonth(timeline, sortOrder) {

        const newTbl = document.createElement("table");
        newTbl.classList.add("release-timeline")
        
        //create table body
        let newTbody = document.createElement("tbody");
    
        //check to create an empty row separator
        let isLongRow = 0;

        let prevYearExists = false;
        let nextYearExists = timeline[1] !== undefined ? true : false;
        let nextYear = timeline[1] == undefined ? undefined : Number(timeline[1].year);

        timeline.forEach( (item, index) => {

            nextYearExists = timeline[index+1] !== undefined ? true : false;
            nextYear = timeline[index+1] == undefined ? undefined : Number(timeline[index+1].year);

            newTbody = this.renderYearMonth(item, prevYearExists, nextYearExists, nextYear, newTbody, sortOrder);
            prevYearExists = true;
            
        });

        newTbl.appendChild(newTbody);
    
        return newTbl;
        /*
        [
            { year: 2020, months: [
                    { yearMonth: "Aug", values: ["Brothers", "Bastion"] },
                    { yearMonth: "Sep", values: ["Pyre"] },
                    { yearMonth: "Nov", values: ["Edith Finch"] } ]
            },

            { year: 2022, months: [
                    { yearMonth: "Feb", values: ["Test1"] },
                    { yearMonth: "Jul", values: ["Test2", "Test3"] } ]
            }
        ];

        [
            { year: 2020, month: "Aug", values: ["Brothers", "Bastion"] },
            { year: 2020, month: "Sep", values: ["Pyre"] },
            { year: 2020, month: "Nov", values: ["Edith Finch"] },
            { year: 2022, month: "Feb", values: ["Test1"] },
            { year: 2022, month: "Jul", values: ["Test2", "Test3"] }
        ];
        */
    }

    renderYearMonth(item, prevYearExists, nextYearExists, nextYear, newTbody, sortOrder) {

       newTbody.appendChild(this.createRowSeparatorYearMonth('no-border'));

        let currentYear = item.year;

        if(sortOrder == 'desc') {
            var firstMonth = moment.max(...item.months.map(o => moment(o.yearMonth)));
            var lastMonth = moment.min(...item.months.map(o => moment(o.yearMonth)));
        }
        else if (sortOrder == 'asc') {
            var firstMonth = moment.min(...item.months.map(o => moment(o.yearMonth)));
            var lastMonth = moment.max(...item.months.map(o => moment(o.yearMonth)));
        }
        

        if(prevYearExists) {
            if(sortOrder == 'asc' && firstMonth.format('MM') != '01') { firstMonth = moment([currentYear, 0]); }
            if(sortOrder == 'desc' && firstMonth.format('MM') != '12') { firstMonth = moment([currentYear, 11]); }
        };

        if(nextYearExists) {
            if(sortOrder == 'asc' && lastMonth.format('MM') != '12') { lastMonth = moment([currentYear, 11]); }
            if(sortOrder == 'desc' && lastMonth.format('MM') != '01') { lastMonth = moment([currentYear, 0]); }
        };
        
        let nbRows = Math.abs(firstMonth.diff(lastMonth, 'months'))+1;
        

        for(let q=0; q<item.months.length; q++) {
            if (item.months[q].values.length>1){
                nbRows += item.months[q].values.length - 1;
            }
        }
        nbRows += 1;

        let monthDiff = Math.abs(firstMonth.diff(lastMonth, 'months'));
        let iterator = sortOrder == 'asc' ? 1 : -1;

        let isLongRow0 = false;
        let ii = moment(firstMonth);
        for (let qq = 0; qq<=monthDiff; qq++) {
            
            let ind2 = item.months.findIndex(e => e.yearMonth === ii.format('YYYY-MM'));
            if(isLongRow0) {nbRows+=1};

            if(ind2 > -1) {
                isLongRow0 = false;
                if(item.months[ind2].values.length == 1) {}
                else {
                    if(qq!=0){nbRows+=1};
                    isLongRow0 = true;
                }
            }
            else {isLongRow0 = false;}

            ii.add(iterator , 'months');
        };


        let yearRow = this.createRowYear( { val: currentYear, cls: 'year-header', rowspanNb: nbRows } );
        const newYearRow = this.createNewRow(yearRow);
        newTbody.appendChild(newYearRow);

        let i = moment(firstMonth);

        let isLongRow = false;

        for (let q = 0; q<=monthDiff; q++) {
            
            let ind = item.months.findIndex(e => e.yearMonth === i.format('YYYY-MM'));

            if(isLongRow) {newTbody.appendChild(this.createRowSeparator())};

            //if month exists, create real records
            if(ind > -1) {
                isLongRow = false;
                
                //create single rows
                if(item.months[ind].values.length == 1) {
                    const rowYear = this.createRowYear( { val: i.format('MMM'), cls: 'year-existing', rowspanNb: 1 } );
                    const rowItem = this.createRowItem( { fileName: item.months[ind].values[0][0], fileAlias: item.months[ind].values[0][1] } );
                    const newRow = this.createNewRow(rowYear, rowItem);

                    newTbody.appendChild(newRow);
                }
                //create multiple value rows
                else {
                    if(q!=0) {newTbody.appendChild(this.createRowSeparator())};
                    isLongRow = true;

                    const rowYear = this.createRowYear( { val: i.format('MMM'), cls: 'year-existing', rowspanNb: item.months[ind].values.length } );
                    const rowItem = this.createRowItem( { fileName: item.months[ind].values[0][0], fileAlias: item.months[ind].values[0][1], cls: "td-first" } );
                    const newRow = this.createNewRow(rowYear, rowItem);
                    newTbody.appendChild(newRow);

                    for (let j = 1; j<item.months[ind].values.length; j++) {
                        const rowItem = this.createRowItem( { fileName: item.months[ind].values[j][0], fileAlias: item.months[ind].values[j][1], cls: "td-next" } );
                        const newRow = this.createNewRow(rowItem);
                        newTbody.appendChild(newRow);
                    }
                }    
            }
            //if month doesn't exist, create empty records
            else {
                isLongRow = false;

                const rowYear = this.createRowYear( { val: i.format('MMM'), cls: 'year-nonexisting' } );
                const rowItem = this.createRowItem( { fileName: "", fileAlias: "" } );
                const newRow = this.createNewRow(rowYear, rowItem);

                newTbody.appendChild(newRow);
            }

            i.add(iterator , 'months');

        }

        let yearDiff2 = Math.abs(Number(currentYear)-nextYear);
        
        if (nextYearExists) {
            newTbody.appendChild(this.createRowSeparatorYearMonth('border'));
        }
        else {
            newTbody.appendChild(this.createRowSeparatorYearMonth('no-border'));
        }

        //create empty years
        if(nextYearExists && yearDiff2>1) {

            newTbody.appendChild(this.createRowSeparatorYearMonth('no-border'));

            for(let j = 1; j<yearDiff2; j++) {
                let i = sortOrder == 'asc' ? Number(currentYear)+j : Number(currentYear)-j;

                const rowYear0 = this.createRowYear( { val: "", cls: 'year-header' } );
                const rowYear1 = this.createRowYear( { val: i, cls: 'year-nonexisting' } );
                const rowItem2 = this.createRowItem( { fileName: "", fileAlias: "" } );
                const newRow3 = this.createNewRow(rowYear0, rowYear1, rowItem2);
                newTbody.appendChild(newRow3);
            }

            newTbody.appendChild(this.createRowSeparatorYearMonth('border'));
        }

        return newTbody;

    }

    createTimelineTable(timeline) {
    
        const newTbl = document.createElement("table");
        newTbl.classList.add("release-timeline")
        
        //create table body
        const newTbody = document.createElement("tbody");
    
        //check to create an empty row separator
        let isLongRow = 0;
    
        // check if too many years are selected
        
        let minYear = Math.min(...timeline.key.values);
        let maxYear = Math.max(...timeline.key.values);
    
        if (maxYear - minYear > 5000 && this.plugin.settings.collapseEmptyYears == false) {
            let errorTbl = this.createErrorMsg("Error: More than 5000 years in selection and \"Collapse years\" option is not enabled. Enable this option in plugin settings to build the timeline.");
            return errorTbl;
        };
        
    
        //create rows for table
        let prevYear = Number(timeline[0].key);
    
        timeline.forEach(item => {
            
            //year
            let key = Number(item.key);
            //array of titles, sorted by name
            //let value = item.rows.values.map(k => k.file.name).sort();
            //[[filename1, alias1], [filename2, alias2], ..]
            //let value = item.rows.values.map(k => [k.file.name, typeof k[aliasName] !== 'undefined' ? k[aliasName] : k.file.name]);//.sort((a, b) => b[0] - a[0]);
            
            let value = item.rows.values.map(k => [k[0], k[2]]);

            //create separator if previous row was long
            if (isLongRow == 1) { newTbody.appendChild(this.createRowSeparator()) };
    
            //create empty rows
            let yearDiff = Math.abs(key - prevYear);
            let collapseRows = this.plugin.settings.collapseEmptyYears;
            let collapseLimit = Number(this.plugin.settings.collapseLimit) || 2;
    
            if ( yearDiff > 1) {
                
                //if collapse rows is on - create 1 row
                if ( collapseRows && yearDiff > 2 && yearDiff > collapseLimit ) {
    
                    let yearRange = key > prevYear ? `${prevYear + 1} - ${key - 1}` : `${key + 1} - ${prevYear - 1}`;
    
                    const rowYear = this.createRowYear( { val: yearRange, cls: 'year-nonexisting' } );
                    const rowItem = this.createRowItem( { fileName: "", fileAlias: "" } );
                    const newRow = this.createNewRow(rowYear, rowItem);
                    newTbody.appendChild(newRow);
    
                //if collapse rows is off - create all rows
                } else {
                    
                    for (let j = 1; j < yearDiff; j++) {
                        let i = (key > prevYear) ? prevYear + j : prevYear - j;
        
                        const rowYear = this.createRowYear( { val: i, cls: 'year-nonexisting' } );
                        const rowItem = this.createRowItem( { fileName: "", fileAlias: "" } );
                        const newRow = this.createNewRow(rowYear, rowItem);
                        newTbody.appendChild(newRow);
                    };
    
                };
    
                isLongRow = 0;
    
            };
    
            //create real rows
            //create row with 1 element
            if ( value.length == 1 ) {
    
                isLongRow = 0;
                
                const rowYear = this.createRowYear( { val: key, cls: 'year-existing' } );
                const rowItem = this.createRowItem( { fileName: value[0][0], fileAlias: value[0][1] } );
                const newRow = this.createNewRow(rowYear, rowItem);
                newTbody.appendChild(newRow);
    
            //create rows with multiple elements
            } else {
    
                //create separator if prev row was short, but this one is long
                if (isLongRow == 0) { newTbody.appendChild(this.createRowSeparator()); };
                isLongRow = 1;
                
                //create 1st row
                const rowYear = this.createRowYear( { val: key, cls: 'year-existing', rowspanNb: value.length } );
                const rowItem = this.createRowItem( { fileName: value[0][0], fileAlias: value[0][1], cls: "td-first" } );
                const newRow = this.createNewRow(rowYear, rowItem);
                newTbody.appendChild(newRow);
                
                //create 2nd+ rows
                for (let i = 1; i < value.length; i++) {
    
                    const rowItem = this.createRowItem( { fileName: value[i][0], fileAlias: value[i][1], cls: "td-next" } );
                    const newRow = this.createNewRow(rowItem);
                    newTbody.appendChild(newRow);
    
                };
    
            };
    
            prevYear = key;
    
        });
    
        //append table body to table
        newTbl.appendChild(newTbody);
    
        return newTbl;
    };

    createRowSeparator( { cls } = {} ) {
        const newTdSeparator = createEl("td", { cls: "td-separator" });
        if( typeof cls !== 'undefined' ) {newTdSeparator.setAttribute("class", cls)};

        const rowSeparator = createEl("tr");
        rowSeparator.appendChild(newTdSeparator);
    
        return rowSeparator;
    };

    createRowSeparatorYearMonth(type: string) {
        const newTdSeparator1 = createEl("td", { cls: "td-separator" });
        const newTdSeparator2 = createEl("td", { cls: "td-separator" });
        const newTdSeparator3 = createEl("td", { cls: "td-separator" });
        
        if (type == 'border') {
            newTdSeparator1.setAttribute("class", "line-separator");
            newTdSeparator2.setAttribute("class", "line-separator");
            newTdSeparator3.setAttribute("class", "line-separator");
        }

        const newRow = this.createNewRow(newTdSeparator1, newTdSeparator2, newTdSeparator3);

        return newRow;
    };

    createRowYear( { val, cls, rowspanNb } = {} ) {
        const newTh = createEl("th", {text: val})
        newTh.setAttribute("scope", "row");
        newTh.setAttribute("class", cls);
        if ( typeof rowspanNb !== 'undefined' ) { newTh.setAttribute("rowspan", rowspanNb) };
    
        return newTh;
    };
    
    createRowItem( { fileName, fileAlias, cls } = {} ) {
        const newTd = document.createElement("td");
        if ( typeof cls !== 'undefined' ) { newTd.setAttribute("class", cls) };
        newTd.classList.add("bullet-points");
        
        const newLink = createEl("a", {cls: "internal-link", text: fileAlias});
        newLink.setAttribute("data-href", fileName);
        
        newTd.appendChild(newLink);

        return newTd;
    };

    createNewRow(...args) {
        
        const newRow = document.createElement("tr");
    
        args.forEach((arg, index) => {
            newRow.appendChild(arg);
        });
    
        return newRow;
    };

    parseQuerySortOrder(content: string) {
        
        let regExSortOrder = /sort(?:.*)? (desc|asc)/;
        
        let settingsSort = this.plugin.settings.defaultSortOrder;

        content = content.replace(/[\r\n]+/g," ").toLocaleLowerCase();
        
        let querySortOrderMatch = content.match(regExSortOrder);
        
        let querySortOrder;
        if (querySortOrderMatch === null) {
            return settingsSort;
        } else {
            querySortOrder = querySortOrderMatch[1].trim();
            return querySortOrder;
        }

    };

}