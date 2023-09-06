import ReleaseTimeline from "main";
import { getAPI, isPluginEnabled, DataviewAPI } from "obsidian-dataview";
import { moment } from "obsidian";
import { create } from "domain";
import { createErrorMsg, createRowSeparator, createRowSeparatorYearMonth, createRowSeparatorWeek, createRowYear, createRowItem, createNewRow, parseQuerySortOrder } from "helperFunctions";

export default class MonthTimeline {

    plugin: ReleaseTimeline;

    constructor(plugin: ReleaseTimeline) {
        this.plugin = plugin;
    }

    async renderTimelineMonth(content) {

        //get data from dataview
        const dv = getAPI();
        if ( typeof dv == 'undefined' ) { return createErrorMsg('Dataview is not installed. The Release Timeline plugin requires Dataview to properly function.'); }
        
        //filter data to remove non-dates
        let dvResults;
        let dvResultsFiltered;
        try { 
            dvResults = await dv.query(content);
            let dvResultsValues = dvResults.value.values;

            //filter out null years
            let a = dvResultsValues.filter( x => typeof x[1] !== 'undefined' && x[1] !== null );
            
            //filter out years without a month
            let b = a.filter( x => !(typeof(x[1]) == 'number') );

            //filter out incorrect dates
            dvResultsFiltered = b.filter( x => moment( x[1].toString() ).format('YYYY-MM') != "Invalid date" );
            
            //convert all to moment
            dvResultsFiltered.forEach( x => x[1] = moment(x[1].toString()) );

        }
        catch(error) { 
            return createErrorMsg("Error from dataview: " + error.message);
        }
        
        //transform data to the new structure
        const dvResultsTransformed = this.transformDvResults(dvResultsFiltered);
        if (dvResultsTransformed.length == 0) { return createErrorMsg("No results"); }

        //fill in empty months
        const fullMonthTimelineData = this.fillInMissingMonths(dvResultsTransformed);
        
        //collapse empty years
        const collapsedEmptyYearsTimelineData = this.collapseEmptyYears(fullMonthTimelineData);

        //sort data
        const sortOrder = parseQuerySortOrder(content, this.plugin);
        const sortedTimelineData = this.sortTimelineData(collapsedEmptyYearsTimelineData, sortOrder);

        //mark rows with multiple items which will need separators
        const markedSeparatorsTimelineData = this.markSeparators(sortedTimelineData);

        //render
        const renderedTimeline = this.renderTimeline(markedSeparatorsTimelineData);

        return renderedTimeline;

    }

    transformDvResults(dvResults) {
        
        let transformedResults = [];

        dvResults.forEach(item => {

            //const datePart = item[1].c;
            //const yearPart = datePart.year;
            //const monthPart = datePart.month - 1;
            //const dayPart = datePart.day;
            //const momentDate = moment( { year: yearPart, month: monthPart, day: dayPart } );
            const momentDate = item[1];

            const newYear = moment(momentDate).format('Y');
            const newMonth = moment(momentDate).format('Y-MM');
            const newMonthDisplay = moment(momentDate).format('MMM');

            const fileName = item[0].path.match(/([^\/]+(?=\.)).md/)[1];
            const aliasName = item[2] === null || item[2] === undefined ? fileName : item[2];

            const pageObject = {
                fileName: fileName,
                aliasName: aliasName,
                date: momentDate.format('YYYY-MM-DD')
            };

            let element = transformedResults.find(e => e.month === newMonth);
            if (element) {
                element.contents.push(pageObject);
            }
            else {
                let newMonthObject = { 
                    year: newYear, 
                    month: newMonth, 
                    monthDisplay: newMonthDisplay,
                    contents: [ pageObject ],
                    collapsed: false,
                    separator: false
                }
    
                //newMonthObject.monthDisplay = this.setMonthFormatting(newMonthObject);
    
                transformedResults.push(newMonthObject);
            }

        })

        return transformedResults;
    }

    fillInMissingMonths(contentData) {

        //insert empty weeks
        let filledInData = this.insertEmptyMonthsCollapsedNo(contentData);

        return filledInData;

    }

    insertEmptyMonthsCollapsedNo(contentData) {

        let existingMonths = contentData.map(item => item.month).sort();
        const minMonth = moment( existingMonths[0] );
        const maxMonth = moment( existingMonths[ existingMonths.length - 1 ] );

        for (let month = minMonth; month.isSameOrBefore(maxMonth); month.add(1, 'months')) {
            
            const monthFormatted = month.format('Y-MM');

            if ( ! existingMonths.includes(monthFormatted) ) {

                const newYear = moment(month).format('Y');
                const newMonth = monthFormatted;
                const newMonthDisplay = moment(month).format('MMM')

                const newMonthObject = { 
                    year: newYear, 
                    month: newMonth, 
                    monthDisplay: newMonthDisplay,
                    contents: [],
                    collapsed: false,
                    separator: false
                }

                contentData.push(newMonthObject);
            }
        }

        return contentData;
    }

    collapseEmptyYears(fullMonthTimelineData) {

        let minYear = fullMonthTimelineData.reduce((min, item) => item.year < min ? item.year : min, fullMonthTimelineData[0].year);
        let maxYear = fullMonthTimelineData.reduce((max, item) => item.year > max ? item.year : max, fullMonthTimelineData[0].year);

        for (let year = moment(minYear); year.isSameOrBefore(moment(maxYear)); year.add(1, 'years')) {

            const yearFormatted = year.format('Y');
            const yearData = fullMonthTimelineData.filter(elem => elem.year == yearFormatted);
            const itemsInYear = yearData.reduce((acc, item) => acc + item.contents.length, 0);

            if (itemsInYear == 0) {
                fullMonthTimelineData = fullMonthTimelineData.filter(elem => elem.year != yearFormatted);
                
                const newYear = year.format('Y');
                const newMonth = year.format('Y-MM')

                const newObject = { 
                    year: newYear, 
                    month: newMonth, 
                    monthDisplay: '',
                    contents: [],
                    collapsed: true,
                    separator: false
                }

                fullMonthTimelineData.push(newObject);
            }

        }

        return fullMonthTimelineData;

    }

    sortTimelineData(fullMonthTimelineData, sortOrder) {

        if (sortOrder == 'asc') {
            //sort months
            fullMonthTimelineData.sort( (a,b) => a.month.localeCompare(b.month) );

            //sort data within the months
            fullMonthTimelineData.forEach(item => {
                item.contents.sort( (a,b) => a.date.localeCompare(b.date) );
            })
        }

        if (sortOrder == 'desc') {
            //sort weeks
            fullMonthTimelineData.sort( (a,b) => b.month.localeCompare(a.month) );

            //sort data within the months
            fullMonthTimelineData.forEach(item => {
                item.contents.sort( (a,b) => b.date.localeCompare(a.date) );
            })
        }

        return fullMonthTimelineData;
    
    }

    markSeparators(timelineData) {
        //get scope of year
        //go through the month items in a year
        //if prev item or next item has data - mark as separator

        for (let i = 0; i<timelineData.length; i++) {

            let minusTwoMonthNbItems = timelineData[i-2]?.contents.length ?? 0;
            let minusOneMonthNbItems = timelineData[i-1]?.contents.length ?? 0;;
            let currMonthNbItems = timelineData[i]?.contents.length ?? 0;;
            let plusOneMonthNbItems = timelineData[i+1]?.contents.length ?? 0;;
            
            let condition = 
                ( minusOneMonthNbItems > 1 && (currMonthNbItems > 0 || minusTwoMonthNbItems > 0) )
                || ( currMonthNbItems > 1 && (minusOneMonthNbItems > 0 || plusOneMonthNbItems > 0) );

            if ( condition ) {
                timelineData[i].separator = true;
            }

        }

        return timelineData;

    }

    renderTimeline(sortedTimelineData) {
        
        let rlsTbody = document.createElement("tbody");
        
        let prevYearCollapsed = undefined;

        //loop to render years
        while(sortedTimelineData.length != 0) {
            const currYear = sortedTimelineData[0].year;
            
            let currYearCollapsed = sortedTimelineData[0].collapsed;

            //add separator
            if (! ((currYearCollapsed == true && prevYearCollapsed == true) || prevYearCollapsed == undefined) ) {
                const yearBorder = createRowSeparatorYearMonth('border');
                const yearBorder2 = createRowSeparatorYearMonth('no-border');
                rlsTbody.appendChild(yearBorder);
                rlsTbody.appendChild(yearBorder2);
            }

            prevYearCollapsed = currYearCollapsed;

            const timelineDataFilteredByYear = sortedTimelineData.filter(elem => elem.year == currYear);
            sortedTimelineData = sortedTimelineData.filter(elem => elem.year != currYear);

            if (currYearCollapsed == false) {

                const htmlYearData = this.renderMonthsInYear(timelineDataFilteredByYear);
                const yearRowSpanNb = this.calculateRowSpanYear(htmlYearData);

                let htmlYearTr = createEl("tr");
                let htmlYearTh = createEl("th", {cls: "year-header", text: currYear});
                htmlYearTh.setAttribute("scope", "row");
                htmlYearTh.setAttribute("rowspan", yearRowSpanNb);
                htmlYearTr.appendChild(htmlYearTh);

                rlsTbody.appendChild(htmlYearTr);
                rlsTbody.appendChild(htmlYearData);
            }
            else {
                let htmlYearTr = createEl("tr");
                let htmlYearTd = createEl("td");
                let htmlYearTh = createEl("th", {cls: "year-nonexisting", text: currYear});

                htmlYearTr.appendChild(htmlYearTd);
                htmlYearTr.appendChild(htmlYearTh);

                rlsTbody.appendChild(htmlYearTr);
            }
            
            
        }

        const rlsTbl = document.createElement("table");
        rlsTbl.classList.add("release-timeline");
        rlsTbl.appendChild(rlsTbody);

        return(rlsTbl);
    
    }

    renderMonthsInYear(timelineDataFilteredByYear){

        let yearContainer = document.createDocumentFragment();

        //loop to render weeks
        timelineDataFilteredByYear.forEach(monthData => {

            const currMonthText = monthData.monthDisplay;
            const currMonthHasData = monthData.contents.length;

            const renderSeparator = monthData.separator;

            let htmlMonthTr = createEl("tr");
            
            //render separator for months with multiple items
            if (renderSeparator) {
                let newSeparator = createRowSeparatorYearMonth('no-border');
                yearContainer.appendChild(newSeparator);
            }

            let htmlMonthTh;
            if (currMonthHasData == 0) {
                htmlMonthTh = createEl("th", {cls: "year-nonexisting", text: currMonthText});
            }
            else {
                htmlMonthTh = createEl("th", {cls: "year-existing", text: currMonthText});
            }

            const monthRowSpanNb = this.calculateRowSpanMonth(monthData);
            htmlMonthTh.setAttribute("scope", "row");
            htmlMonthTh.setAttribute("rowspan", monthRowSpanNb);

            htmlMonthTr.appendChild(htmlMonthTh);
            yearContainer.appendChild(htmlMonthTr);

            const createBulletPoints = monthData.contents.length;

            monthData.contents.forEach(monthEvent => {
                //create event row
                const rowItem = createRowItem( { fileName: monthEvent.fileName, fileAlias: monthEvent.aliasName } );
                if (createBulletPoints > 1) {
                    rowItem.addClass('td-next');
                }
                const newRow = createNewRow(rowItem);

                //insert event row
                yearContainer.appendChild(newRow);
            })

        })

        return yearContainer;

    }

    /****************/

    calculateRowSpanYear(htmlYear) {
        var trCount = htmlYear.querySelectorAll('tr').length + 1;
        return trCount;
    }

    calculateRowSpanMonth(dataMonth) {
        let distinctItems = dataMonth.contents.length;

        return distinctItems + 1;
    }

}