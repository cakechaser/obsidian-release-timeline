import ReleaseTimeline from "main";
import { getAPI, isPluginEnabled, DataviewAPI } from "obsidian-dataview";
import { moment } from "obsidian";
import { create } from "domain";
import { createErrorMsg, createRowSeparator, createRowSeparatorYearMonth, createRowYear, createRowItem, createNewRow, parseQuerySortOrder } from "helperFunctions";

export function sumf(num1, num2) {
    return num1+num2;
}

export default class YearTimeline {
    
    plugin: ReleaseTimeline;

    constructor(plugin: ReleaseTimeline) {
        this.plugin = plugin;
    }

    async renderTimeline(content: string) {

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
            return createErrorMsg("Error from dataview: " + error.message)
        }

        if (results.length == 0) {
            return createErrorMsg("No results");
        }
        else {
            return this.createTimelineTable(results);
        }

    };

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
            let errorTbl = createErrorMsg("Error: More than 5000 years in selection and \"Collapse years\" option is not enabled. Enable this option in plugin settings to build the timeline.");
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
            if (isLongRow == 1) { newTbody.appendChild(createRowSeparator()) };
    
            //create empty rows
            let yearDiff = Math.abs(key - prevYear);
            let collapseRows = this.plugin.settings.collapseEmptyYears;
            let collapseLimit = Number(this.plugin.settings.collapseLimit) || 2;
    
            if ( yearDiff > 1) {
                
                //if collapse rows is on - create 1 row
                if ( collapseRows && yearDiff > 2 && yearDiff > collapseLimit ) {
    
                    let yearRange = key > prevYear ? `${prevYear + 1} - ${key - 1}` : `${key + 1} - ${prevYear - 1}`;
    
                    const rowYear = createRowYear( { val: yearRange, cls: 'year-nonexisting' } );
                    const rowItem = createRowItem( { fileName: "", fileAlias: "" } );
                    const newRow = createNewRow(rowYear, rowItem);
                    newTbody.appendChild(newRow);
    
                //if collapse rows is off - create all rows
                } else {
                    
                    for (let j = 1; j < yearDiff; j++) {
                        let i = (key > prevYear) ? prevYear + j : prevYear - j;
        
                        const rowYear = createRowYear( { val: i, cls: 'year-nonexisting' } );
                        const rowItem = createRowItem( { fileName: "", fileAlias: "" } );
                        const newRow = createNewRow(rowYear, rowItem);
                        newTbody.appendChild(newRow);
                    };
    
                };
    
                isLongRow = 0;
    
            };
    
            //create real rows
            //create row with 1 element
            if ( value.length == 1 ) {
    
                isLongRow = 0;
                
                const rowYear = createRowYear( { val: key, cls: 'year-existing' } );
                const rowItem = createRowItem( { fileName: value[0][0], fileAlias: value[0][1] } );
                const newRow = createNewRow(rowYear, rowItem);
                newTbody.appendChild(newRow);
    
            //create rows with multiple elements
            } else {
    
                //create separator if prev row was short, but this one is long
                if (isLongRow == 0) { newTbody.appendChild(createRowSeparator()); };
                isLongRow = 1;
                
                //create 1st row
                const rowYear = createRowYear( { val: key, cls: 'year-existing', rowspanNb: value.length } );
                const rowItem = createRowItem( { fileName: value[0][0], fileAlias: value[0][1], cls: "td-first" } );
                const newRow = createNewRow(rowYear, rowItem);
                newTbody.appendChild(newRow);
                
                //create 2nd+ rows
                for (let i = 1; i < value.length; i++) {
    
                    const rowItem = createRowItem( { fileName: value[i][0], fileAlias: value[i][1], cls: "td-next" } );
                    const newRow = createNewRow(rowItem);
                    newTbody.appendChild(newRow);
    
                };
    
            };
    
            prevYear = key;
    
        });
    
        //append table body to table
        newTbl.appendChild(newTbody);
    
        return newTbl;
    };

}
