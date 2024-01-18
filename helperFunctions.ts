import ReleaseTimeline from "main";
import { App } from 'obsidian';


export {createErrorMsg, createRowSeparator, createRowSeparatorYearMonth, createRowSeparatorWeek, createRowYear, createRowItem, createNewRow, parseQuerySortOrder, replaceThisInQuery };

function createErrorMsg(errorText) {
    const errorTbl = createEl("table", { cls: "release-timeline" } );
    const newI = createEl("i", {text: errorText})
    errorTbl.appendChild(newI);

    return errorTbl;
}

function createNewRow(...args) {
        
    const newRow = document.createElement("tr");

    args.forEach((arg, index) => {
        newRow.appendChild(arg);
    });

    return newRow;
}

function createRowSeparator( { cls } = {} ) {
    const newTdSeparator = createEl("td", { cls: "td-separator" });
    if( typeof cls !== 'undefined' ) {newTdSeparator.setAttribute("class", cls)};

    const rowSeparator = createEl("tr");
    rowSeparator.appendChild(newTdSeparator);

    return rowSeparator;
}

function createRowSeparatorYearMonth(type: string) {
    const newTdSeparator1 = createEl("td", { cls: "td-separator" });
    const newTdSeparator2 = createEl("td", { cls: "td-separator" });
    const newTdSeparator3 = createEl("td", { cls: "td-separator" });
    
    if (type == 'border') {
        newTdSeparator1.setAttribute("class", "line-separator");
        newTdSeparator2.setAttribute("class", "line-separator");
        newTdSeparator3.setAttribute("class", "line-separator");
    }

    const newRow = createNewRow(newTdSeparator1, newTdSeparator2, newTdSeparator3);

    return newRow;
}

function createRowSeparatorWeek(type: string) {
    const newTdSeparator1 = createEl("td", { cls: "td-separator" });
    newTdSeparator1.setAttribute("colspan", "4");
    
    if (type == 'border') {
        newTdSeparator1.setAttribute("class", "line-separator");
    }

    const newRow = createNewRow(newTdSeparator1);

    return newRow;
}

function createRowYear( { val, cls, rowspanNb } = {} ) {
    const newTh = createEl("th", {text: val})
    newTh.setAttribute("scope", "row");
    newTh.setAttribute("class", cls);
    if ( typeof rowspanNb !== 'undefined' ) { newTh.setAttribute("rowspan", rowspanNb) };

    return newTh;
}

function createRowItem( { fileName, fileAlias, cls } = {} ) {
    const newTd = document.createElement("td");
    if ( typeof cls !== 'undefined' ) { newTd.setAttribute("class", cls) };
    newTd.classList.add("bullet-points");
    
    const newLink = createEl("a", {cls: "internal-link", text: fileAlias});
    newLink.setAttribute("data-href", fileName);
    
    newTd.appendChild(newLink);

    return newTd;
}

function parseQuerySortOrder(content: string, plugin:ReleaseTimeline) {
        
    let regExSortOrder = /sort(?:.*)? (desc|asc)/;
    
    let settingsSort = plugin.settings.defaultSortOrder;

    content = content.replace(/[\r\n]+/g," ").toLocaleLowerCase();
    
    let querySortOrderMatch = content.match(regExSortOrder);
    
    let querySortOrder;
    if (querySortOrderMatch === null) {
        return settingsSort;
    } else {
        querySortOrder = querySortOrderMatch[1].trim();
        return querySortOrder;
    }

}

function replaceThisInQuery(query: string, app: App) {

    const regex = /([\n \(])this\./g;

    let activeFileName = "";
    try {
        activeFileName = app.workspace.getActiveFile().basename;
    }
    catch(error) {
        return query;
    }
    
    const newQuery = query.replace(regex, (match, precedingChar) => {
        return `${precedingChar}[[${activeFileName}]].`;
    });

    console.log(activeFileName);
    console.log(newQuery);

    return newQuery;
}
