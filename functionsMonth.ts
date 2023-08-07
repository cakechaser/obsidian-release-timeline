import ReleaseTimeline from "main";
import { getAPI, isPluginEnabled, DataviewAPI } from "obsidian-dataview";
import { moment } from "obsidian";
import { create } from "domain";
import { createErrorMsg, createRowSeparator, createRowSeparatorYearMonth, createRowYear, createRowItem, createNewRow, parseQuerySortOrder } from "helperFunctions";

export default class MonthTimeline {

    plugin: ReleaseTimeline;

    constructor(plugin: ReleaseTimeline) {
        this.plugin = plugin;
    }

    async renderTimelineMonth(content: string) {
        
        const dv = getAPI();

        if ( typeof dv == 'undefined' ) { return createErrorMsg('Dataview is not installed. The Release Timeline plugin requires Dataview to properly function.'); }

        var sortOrder = parseQuerySortOrder(content, this.plugin);

        //get results from dataview
        try {
            
            var results;
            var results0 = await dv.query(content);
            let a = results0.value.values;
            
            //filter out null years
            let b = a.filter(x => typeof x[1] !== 'undefined' && x[1] !== null);
            //filter out years without a month
            b = b.filter(x => !(typeof(x[1]) == 'number') );

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
            return createErrorMsg("Error from dataview: " + error.message)
        }

        if (results.length == 0) {
            return createErrorMsg("No results");
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
        ];

        */
    }

    renderYearMonth(item, prevYearExists, nextYearExists, nextYear, newTbody, sortOrder) {

        newTbody.appendChild(createRowSeparatorYearMonth('no-border'));
 
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
 
 
         let yearRow = createRowYear( { val: currentYear, cls: 'year-header', rowspanNb: nbRows } );
         const newYearRow = createNewRow(yearRow);
         newTbody.appendChild(newYearRow);
 
         let i = moment(firstMonth);
 
         let isLongRow = false;
 
         for (let q = 0; q<=monthDiff; q++) {
             
             let ind = item.months.findIndex(e => e.yearMonth === i.format('YYYY-MM'));
 
             if(isLongRow) {newTbody.appendChild(createRowSeparator())};
 
             //if month exists, create real records
             if(ind > -1) {
                 isLongRow = false;
                 
                 //create single rows
                 if(item.months[ind].values.length == 1) {
                     const rowYear = createRowYear( { val: i.format('MMM'), cls: 'year-existing', rowspanNb: 1 } );
                     const rowItem = createRowItem( { fileName: item.months[ind].values[0][0], fileAlias: item.months[ind].values[0][1] } );
                     const newRow = createNewRow(rowYear, rowItem);
 
                     newTbody.appendChild(newRow);
                 }
                 //create multiple value rows
                 else {
                     if(q!=0) {newTbody.appendChild(createRowSeparator())};
                     isLongRow = true;
 
                     const rowYear = createRowYear( { val: i.format('MMM'), cls: 'year-existing', rowspanNb: item.months[ind].values.length } );
                     const rowItem = createRowItem( { fileName: item.months[ind].values[0][0], fileAlias: item.months[ind].values[0][1], cls: "td-first" } );
                     const newRow = createNewRow(rowYear, rowItem);
                     newTbody.appendChild(newRow);
 
                     for (let j = 1; j<item.months[ind].values.length; j++) {
                         const rowItem = createRowItem( { fileName: item.months[ind].values[j][0], fileAlias: item.months[ind].values[j][1], cls: "td-next" } );
                         const newRow = createNewRow(rowItem);
                         newTbody.appendChild(newRow);
                     }
                 }    
             }
             //if month doesn't exist, create empty records
             else {
                 isLongRow = false;
 
                 const rowYear = createRowYear( { val: i.format('MMM'), cls: 'year-nonexisting' } );
                 const rowItem = createRowItem( { fileName: "", fileAlias: "" } );
                 const newRow = createNewRow(rowYear, rowItem);
 
                 newTbody.appendChild(newRow);
             }
 
             i.add(iterator , 'months');
 
         }

 
         let yearDiff2 = Math.abs(Number(currentYear)-nextYear);
         
         if (nextYearExists) {
             newTbody.appendChild(createRowSeparatorYearMonth('border'));
         }
         else {
             newTbody.appendChild(createRowSeparatorYearMonth('no-border'));
         }
 
         //create empty years
         if(nextYearExists && yearDiff2>1) {
             newTbody = this.createEmptyYears(newTbody, yearDiff2, sortOrder, currentYear);
         }
 
         return newTbody;
 
     }

     createEmptyYears(newTbody, yearDiff, sortOrder, currentYear) {
        newTbody.appendChild(createRowSeparatorYearMonth('no-border'));
 
             for(let j = 1; j<yearDiff; j++) {
                 let i = sortOrder == 'asc' ? Number(currentYear)+j : Number(currentYear)-j;
 
                 const rowYear0 = createRowYear( { val: "", cls: 'year-header' } );
                 const rowYear1 = createRowYear( { val: i, cls: 'year-nonexisting' } );
                 const rowItem2 = createRowItem( { fileName: "", fileAlias: "" } );
                 const newRow3 = createNewRow(rowYear0, rowYear1, rowItem2);
                 newTbody.appendChild(newRow3);
             }
 
             newTbody.appendChild(createRowSeparatorYearMonth('border'));

             return newTbody;
     }

}
