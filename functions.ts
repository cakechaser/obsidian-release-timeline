import ReleaseTimeline from "main";
import { getAPI, isPluginEnabled, DataviewAPI } from "obsidian-dataview";
import { moment } from "obsidian";
import { create } from "domain";

export default class HelpFunctions {
    
    plugin: ReleaseTimeline;

    constructor(plugin: ReleaseTimeline) {
        this.plugin = plugin;
    }

    createRowSeparator() {
        const newTdSeparator = createEl("td", { cls: "td-separator" });
        const rowSeparator = createEl("tr");
        rowSeparator.appendChild(newTdSeparator);
    
        return rowSeparator;
    };
    
    createRowYear( { val, cls, rowspanNb } = {} ) {
        const newTh = document.createElement("th");
        newTh.setAttribute("scope", "row");
        newTh.setAttribute("class", cls);
        if ( typeof rowspanNb !== 'undefined' ) { newTh.setAttribute("rowspan", rowspanNb) };
        newTh.innerHTML = val;
    
        return newTh;
    };
    
    createRowItem( { val, cls } = {} ) {
        const newTd = document.createElement("td");
        if ( typeof cls !== 'undefined' ) { newTd.setAttribute("class", cls) };
        newTd.classList.add("bullet-points");
        
        const newLink = createEl("a", {cls: "internal-link"});
        newLink.setAttribute("data-href", val);
        newLink.innerHTML = val;
        
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
    
    createErrorMsg(errorText) {
        const errorTbl = createEl("table", { cls: "release-timeline" } );
        const newI = document.createElement("i");
        newI.innerHTML = errorText;
        errorTbl.appendChild(newI);
    
        return errorTbl;
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
            let errorTbl = this.createErrorMsg("Error: More than 5000 years in selection and \"Collapse years\" option is not enabled. Enable this option in plugin settings to build the timeline.");
            return errorTbl;
        };
        
    
        //create rows for table
        let prevYear = timeline[0].key;
    
        timeline.forEach(item => {
            
            let key = item.key;
            let value = item.rows.values.map(k => k.file.name).sort();
    
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
                    const rowItem = this.createRowItem( { val: "" } );
                    const newRow = this.createNewRow(rowYear, rowItem);
                    newTbody.appendChild(newRow);
    
                //if collapse rows is off - create all rows
                } else {
                    
                    for (let j = 1; j < yearDiff; j++) {
    
                    let i = (key > prevYear) ? prevYear + j : prevYear - j;
    
                    const rowYear = this.createRowYear( { val: i, cls: 'year-nonexisting' } );
                    const rowItem = this.createRowItem( { val: "" } );
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
                const rowItem = this.createRowItem( { val: value[0] } );
                const newRow = this.createNewRow(rowYear, rowItem);
                newTbody.appendChild(newRow);
    
            //create rows with multiple elements
            } else {
    
                //create separator if prev row was short, but this one is long
                if (isLongRow == 0) { newTbody.appendChild(this.createRowSeparator()); };
                isLongRow = 1;
    
                const rowYear = this.createRowYear( { val: key, cls: 'year-existing', rowspanNb: value.length } );
                const rowItem = this.createRowItem( { val: value[0], cls: "td-first" } );
                const newRow = this.createNewRow(rowYear, rowItem);
                newTbody.appendChild(newRow);
                
                //create 2nd+ rows
                for (let i = 1; i < value.length; i++) {
    
                    const rowItem = this.createRowItem( { val: value[i], cls: "td-next" } );
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

    parseQueryFrom(content: string) {
        
        let regExFrom = /(?<=from)(.*?)(where|sort|$)/;
        let queryFrom = content.match(regExFrom)[1].trim();

        return queryFrom;
    };

    parseQueryYear(content: string) {

        let regExYear = /(?:table|table without id)?(.*?)(?=from)/;
        let queryYearColumn = content.match(regExYear)[1].trim();

        return queryYearColumn;
    };

    parseQueryWhere(content: string) {
        
        let regExWhere = /where(.*)/;
        let queryWhereMatch = content.match(regExWhere);
        
        let queryWhere = queryWhereMatch === null ? '' : queryWhereMatch[1].trim();
        queryWhere = queryWhere.replace(' and ', ' && ').replace(' or ', ' || ');

        return queryWhere;
    };


    parseQuerySortOrder(content: string) {
        
        let regExSortOrder = /sort(?:.*)? (desc|asc)/;
        
        let settingsSort = this.plugin.settings.defaultSortOrder;
        
        let querySortOrderMatch = content.match(regExSortOrder);
        
        let querySortOrder;
        if (querySortOrderMatch === null) {
            return settingsSort;
        } else {
            querySortOrder = querySortOrderMatch[1].trim();
            return querySortOrder;
        }

    };

    renderTimeline(content: string) {

        const dv = getAPI();

        if ( typeof dv == 'undefined' ) { return this.createErrorMsg('Dataview is not installed. This plugin requires Dataview to work properly.'); }

        content = content.replace(/[\r\n]+/g," ").toLocaleLowerCase();
		
        try { 
            var queryFrom = this.parseQueryFrom(content); 
        }
        catch(error) { 
            return this.createErrorMsg("Error parsing the 'FROM' statement"); 
        }
        
        try { 
            var queryYearColumn = this.parseQueryYear(content); 
        }
        catch(error) { 
            return this.createErrorMsg("Error getting the 'Year' field"); 
        }
        
        //let queryWhere = this.parseQueryWhere(content);
                
        let querySortOrder = this.parseQuerySortOrder(content);
        
        //get results from dataview
        try {
            var results = dv.pages(queryFrom)
                                        .filter(k => typeof k[queryYearColumn] !== 'undefined')
                                        .mutate(k => k[queryYearColumn] = moment( k[queryYearColumn].toString() ).format('YYYY') )
                                        .filter(k => k[queryYearColumn] != "Invalid date")
                                        .mutate(k => k[queryYearColumn] = Number(k[queryYearColumn]) )
                                        .groupBy(k => k[queryYearColumn])
                                        .sort(k => k.key, querySortOrder);
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

    }

}
