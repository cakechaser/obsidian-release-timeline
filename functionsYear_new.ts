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

}