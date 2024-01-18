import ReleaseTimeline from "main";
import { getAPI, isPluginEnabled, DataviewAPI, DateTime } from "obsidian-dataview";
import { moment } from "obsidian";
import { create } from "domain";
import { createErrorMsg, createRowSeparator, createRowSeparatorYearMonth, createRowSeparatorWeek, createRowYear, createRowItem, createNewRow, parseQuerySortOrder, replaceThisInQuery } from "helperFunctions";
import { weekdays } from "moment";

export default class WeekTimeline {

    plugin: ReleaseTimeline;

    constructor(plugin: ReleaseTimeline) {
        this.plugin = plugin;
    }

    async renderTimelineWeek(content) {

        //get data from dataview
        const dv = getAPI();
        if ( typeof dv == 'undefined' ) { return createErrorMsg('Dataview is not installed. The Release Timeline plugin requires Dataview to properly function.'); }
        
        let dvResults;
        let dvResultsFiltered;
        try { 
            content = replaceThisInQuery(content, this.plugin.app);
            dvResults = await dv.query(content);
            let dvResultsValues = dvResults.value.values;

            //filter out null years
            let a = dvResultsValues.filter( x => typeof x[1] !== 'undefined' && x[1] !== null );
            
            //filter out years without a date
            let b = a.filter( x => !(typeof(x[1]) == 'number') );

            //filter out incorrect dates
            dvResultsFiltered = b.filter( x => moment( x[1].toString() ).format('YYYY-MM') != "Invalid date" );
            
            //convert all to moment
            dvResultsFiltered.forEach( x => x[1] = moment(x[1].toString()) );

        }
        catch(error) { 
            return createErrorMsg("Error from dataview: " + error.message);
        }
        
        //works
        const dvResultsTransformed = this.transformDvResults(dvResultsFiltered);
        if (dvResultsTransformed.length == 0) { return createErrorMsg("No results"); }

        //transformation
        const fullWeekTimelineData = this.fillInMissingWeeks(dvResultsTransformed);
        const collapsedEmptyWeeksTimelineData = this.collapseEmptyWeeks(fullWeekTimelineData);

        const sortOrder = parseQuerySortOrder(content, this.plugin);
        const sortedTimelineData = this.sortTimelineData(collapsedEmptyWeeksTimelineData, sortOrder);

        const renderedTimeline = this.renderTimeline(sortedTimelineData);

        return renderedTimeline;

    }

    transformDvResults(dvResults) {
        
        let transformedResults = [];

        dvResults.forEach(item => {

            //const datePart = item[1].c;
            // const yearPart = datePart.year;
            // const monthPart = datePart.month - 1;
            // const dayPart = datePart.day;
            // const momentDate = moment( { year: yearPart, month: monthPart, day: dayPart } );
            const momentDate = item[1];
            const momentDateThursday = moment(momentDate).isoWeekday(4);

            const newYear = momentDateThursday.format('Y');
            const newMonth = momentDateThursday.format('Y-MM');
            const newWeek = momentDateThursday.format('GGGG-[W]WW');
            const newWeekStart = momentDateThursday.isoWeekday(1).format('GGGG-MM-DD');
            const newWeekEnd = momentDateThursday.isoWeekday(7).format('GGGG-MM-DD');

            const fileName = item[0].path.match(/([^\/]+(?=\.)).md/)[1];
            const aliasName = item[2] === null || item[2] === undefined ? fileName : item[2];

            const pageObject = {
                fileName: fileName,
                aliasName: aliasName,
                date: momentDate.format('YYYY-MM-DD')
            };

            let element = transformedResults.find(e => e.week === newWeek);
            if (element) {
                element.contents.push(pageObject);
            }
            else {
                let newWeekObject = { 
                    year: newYear, 
                    month: newMonth, 
                    week: newWeek, 
                    weekDisplay: '',
                    weekStart: newWeekStart,
                    weekEnd: newWeekEnd,
                    contents: [ pageObject ],
                    collapsed: false
                }
    
                newWeekObject.weekDisplay = this.setWeekFormatting(newWeekObject);
    
                transformedResults.push(newWeekObject);
            }

        })

        return transformedResults;
    }

    fillInMissingWeeks(contentData) {
        /*
        let contentData = 
        [
            {   year: '2022', month: '2022-01', week: '2022-W01', collapsed: false, weekDisplay: 'W01: [03 - 09]', weekStart: '2023-01-03', weekEnd: '2023-01-09', contents: [
                    {fileName: 'Event1', aliasName: 'Event1', date: '2023-01-03'},
                    {fileName: 'Event2', aliasName: 'Event2', date: '2023-01-04'}
                ] 
            },
            {
                year:'2023', month: '2023-02', week: '2023-W06', collapsed: false, weekDisplay: 'W06: [06-12]', weekStart: '2023-02-06', weekEnd: '2022-02-12', contents: [
                    {fileName: 'Event3', aliasName: 'Event3', date: '2023-02-07'}
                ]
            }
        ];
        */

        //insert empty weeks
        let filledInData = this.insertEmptyWeeksCollapsedNo(contentData);

        return filledInData;

    }

    insertEmptyWeeksCollapsedNo(contentData) {

        let existingWeeks = contentData.map(item => item.week).sort();
        const minWeek = moment( existingWeeks[0] );
        const maxWeek = moment( existingWeeks[ existingWeeks.length - 1 ] );

        for (let week = minWeek; week.isSameOrBefore(maxWeek); week.add(1, 'weeks')) {
            
            const weekFormatted = week.format('GGGG-[W]WW');

            if ( ! existingWeeks.includes(weekFormatted) ) {

                const newYear = moment(week).add(3, 'days').format('Y');
                const newMonth = moment(week).add(3, 'days').format('Y-MM');
                const newWeek = weekFormatted;
                const newWeekStart = week.format('GGGG-MM-DD');
                const newWeekEnd = moment(week).add(6, 'days').format('GGGG-MM-DD');

                const newWeekObject = { 
                    year: newYear, 
                    month: newMonth, 
                    week: newWeek, 
                    weekDisplay: '',
                    weekStart: newWeekStart,
                    weekEnd: newWeekEnd,
                    contents: [],
                    collapsed: false
                }

                newWeekObject.weekDisplay = this.setWeekFormatting(newWeekObject);

                contentData.push(newWeekObject);
            }
        }

        return contentData;
    }

    collapseEmptyWeeks(fullWeekTimelineData) {

        //don't do anything if option is turned off
        if (this.plugin.settings.collapseEmptyMonthsWeeklyTimeline == false) {
            return fullWeekTimelineData;
        }

        let minMonth = fullWeekTimelineData.reduce((min, item) => item.month < min ? item.month : min, fullWeekTimelineData[0].month);
        let maxMonth = fullWeekTimelineData.reduce((max, item) => item.month > max ? item.month : max, fullWeekTimelineData[0].month);

        for (let month = moment(minMonth); month.isSameOrBefore(moment(maxMonth)); month.add(1, 'months')) {

            const monthFormatted = month.format('Y-MM');
            const monthData = fullWeekTimelineData.filter(elem => elem.month == monthFormatted);
            const itemsInMonth = monthData.reduce((acc, item) => acc + item.contents.length, 0);

            if (itemsInMonth == 0) {
                fullWeekTimelineData = fullWeekTimelineData.filter(elem => elem.month != monthFormatted);
                
                const newYear = month.format('Y');
                const newMonth = monthFormatted;
                const newWeek = monthData.reduce((min, item) => item.week < min ? item.week : min, monthData[0].week);
                const newWeekStart = monthData.reduce((min, item) => item.weekStart < min ? item.weekStart : min, monthData[0].weekStart);
                const newWeekEnd = monthData.reduce((max, item) => item.weekEnd > max ? item.weekEnd : max, monthData[0].weekEnd);

                const newWeekObject = { 
                    year: newYear, 
                    month: newMonth, 
                    week: newWeek, 
                    weekDisplay: '',
                    weekStart: newWeekStart,
                    weekEnd: newWeekEnd,
                    contents: [],
                    collapsed: true
                }

                newWeekObject.weekDisplay = this.setWeekFormatting(newWeekObject);

                fullWeekTimelineData.push(newWeekObject);
            }

        }

        return fullWeekTimelineData;

    }

    sortTimelineData(fullWeekTimelineData, sortOrder) {

        if (sortOrder == 'asc') {
            //sort weeks
            fullWeekTimelineData.sort( (a,b) => a.week.localeCompare(b.week) );

            //sort data within the weeks
            fullWeekTimelineData.forEach(item => {
                item.contents.sort( (a,b) => a.date.localeCompare(b.date) );
            })
        }

        if (sortOrder == 'desc') {
            //sort weeks
            fullWeekTimelineData.sort( (a,b) => b.week.localeCompare(a.week) );

            //sort data within the weeks
            fullWeekTimelineData.forEach(item => {
                item.contents.sort( (a,b) => b.date.localeCompare(a.date) );
            })
        }

        return fullWeekTimelineData;
    
    }

    renderTimeline(sortedTimelineData) {
        
        let rlsTbody = document.createElement("tbody");
        
        //loop to render years
        while(sortedTimelineData.length != 0) {
            const currYear = sortedTimelineData[0].year;
            const timelineDataFilteredByYear = sortedTimelineData.filter(elem => elem.year == currYear);
            sortedTimelineData = sortedTimelineData.filter(elem => elem.year != currYear);

            const htmlYearData = this.renderMonthsInYear(timelineDataFilteredByYear);
            const yearRowSpanNb = this.calculateRowSpanYear(htmlYearData);

            let htmlYearTr = createEl("tr");
            let htmlYearTh = createEl("th", {cls: "year-header", text: currYear});
            htmlYearTh.setAttribute("scope", "row");
            htmlYearTh.setAttribute("rowspan", yearRowSpanNb);
            htmlYearTr.appendChild(htmlYearTh);

            rlsTbody.appendChild(htmlYearTr);
            rlsTbody.appendChild(htmlYearData);

            //add separator
            if (sortedTimelineData.length != 0) {
                const yearBorder = createRowSeparatorWeek('border');
                const yearBorder2 = createRowSeparatorWeek('no-border');
                rlsTbody.appendChild(yearBorder);
                rlsTbody.appendChild(yearBorder2);
            }
            
        }

        const rlsTbl = document.createElement("table");
        rlsTbl.classList.add("release-timeline");
        rlsTbl.appendChild(rlsTbody);

        return(rlsTbl);
    
    }

    renderMonthsInYear(timelineDataFilteredByYear){

        let yearContainer = document.createDocumentFragment();

        let lastMonthIsCollpased = false;

        //loop to render months
        while(timelineDataFilteredByYear.length != 0) {
            const currMonth = timelineDataFilteredByYear[0].month;
            const currentMonthIsCollapsed = timelineDataFilteredByYear[0].collapsed;
            const currMonthText = moment(timelineDataFilteredByYear[0].month).format('MMM');

            //separators for collapsed months
            if (lastMonthIsCollpased == true && currentMonthIsCollapsed == true) {
            }
            else {
                yearContainer.appendChild(createRowSeparatorWeek('no-border'));
            }
            
            lastMonthIsCollpased = currentMonthIsCollapsed;

            const timelineDataFilteredByMonth = timelineDataFilteredByYear.filter(elem => elem.month == currMonth);
            timelineDataFilteredByYear = timelineDataFilteredByYear.filter(elem => elem.month != currMonth);

            //make row with month --need to add rowspan depending on the nb of weeks
            let htmlMonthTr = createEl("tr");
            let htmlMonthTh;
            if (currentMonthIsCollapsed == true) {
                htmlMonthTh = createEl("td", {text: ''});
            }
            else {
                htmlMonthTh = createEl("td", {cls: "weekly-month", text: currMonthText});
            }
            
            
            const monthRowSpanNb = this.calculateRowSpanMonth(timelineDataFilteredByMonth);
            
            //don't render additional space if row is a collapsed month
            if ( timelineDataFilteredByMonth[0].collapsed == false ) {
                htmlMonthTh.setAttribute("scope", "row");
                htmlMonthTh.setAttribute("rowspan", monthRowSpanNb);
                htmlMonthTr.appendChild(htmlMonthTh);
                yearContainer.appendChild(htmlMonthTr);
            }

            const htmlMonthData = this.renderWeeksInMonth(timelineDataFilteredByMonth);

            yearContainer.appendChild(htmlMonthData);

        }

        return yearContainer;

    }

    renderWeeksInMonth(timelineDataFilteredByMonth){
        
        let monthContainer = document.createDocumentFragment();

        //loop to render weeks
        timelineDataFilteredByMonth.forEach(weekData => {

            const currWeekText = this.setWeekFormatting(weekData);

            const currWeekHasData = weekData.contents.length;

            let htmlWeekTr = createEl("tr");
            
            let htmlWeekTh;
            if (currWeekHasData == 0) {
                htmlWeekTh = createEl("th", {cls: "year-nonexisting", text: currWeekText});
            }
            else {
                htmlWeekTh = createEl("td", {cls: "year-existing", text: currWeekText});
            }

            const weekRowSpanNb = this.calculateRowSpanWeek(weekData);
            htmlWeekTh.setAttribute("scope", "row");
            htmlWeekTh.setAttribute("rowspan", weekRowSpanNb);

            //for collapsed months add a blank data element
            if (weekData.collapsed == true) {
                let htmlWeekTd = createEl("td");
                htmlWeekTr.appendChild(htmlWeekTd);
            }

            htmlWeekTr.appendChild(htmlWeekTh);

            monthContainer.appendChild(htmlWeekTr);

            const createBulletPoints = weekData.contents.length;

            weekData.contents.forEach(weekEvent => {
                //create event row
                const rowItem = createRowItem( { fileName: weekEvent.fileName, fileAlias: weekEvent.aliasName } );
                if (createBulletPoints > 1) {
                    rowItem.addClass('td-next');
                }
                const newRow = createNewRow(rowItem);

                //insert event row
                monthContainer.appendChild(newRow);
            })

        })

        return monthContainer;

    }

    /******************/

    calculateRowSpanYear(htmlYear) {
        var trCount = htmlYear.querySelectorAll('tr').length + 1;
        return trCount;
    }

    calculateRowSpanMonth(dataMonth) {
        let distinctWeeks = dataMonth.length;
        let distinctItems = dataMonth.reduce((acc, item) => acc + item.contents.length, 0);

        return distinctWeeks + distinctItems + 1;
    }

    calculateRowSpanWeek(dataWeek) {
        let distinctItems = dataWeek.contents.length;

        return distinctItems + 1;
    }

    setWeekFormatting(weekData) {

        const formatType = this.plugin.settings.weekDisplayFormat;

        const weekNb = moment(weekData.weekStart).format('WW');
        const weekStart = moment(weekData.weekStart).format('DD');
        const weekEnd = moment(weekData.weekEnd).format('DD');
        
        const monthNbStart = moment(weekData.weekStart).format('MM');
        const monthNbEnd = moment(weekData.weekEnd).format('MM');

        let weekText;
        
        if (weekData.collapsed == true) {
            weekText = moment(weekData.month).format('MMM');
        }
        else if (formatType == 'weekNames') {
            weekText = 'W' + weekNb;
        }
        else if (formatType == 'dateNames') {
            weekText = weekStart + '-' + weekEnd;
        }

        return weekText;
    }

}
