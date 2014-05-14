// -*- Mode: js; indent-tabs-mode: nil; c-basic-offset: 4; tab-width: 4 -*-
//
// Copyright (c) 2012 Giovanni Campagna <scampa.giovanni@gmail.com>
//
// Gnome Weather is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by the
// Free Software Foundation; either version 2 of the License, or (at your
// option) any later version.
//
// Gnome Weather is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
// or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
// for more details.
//
// You should have received a copy of the GNU General Public License along
// with Gnome Weather; if not, write to the Free Software Foundation,
// Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA

const Gettext = imports.gettext;

const DAY_PARTS = [
    [N_("Monday night"), N_("Monday morning"), N_("Monday afternoon"), N_("Monday evening")],
    [N_("Tuesday night"), N_("Tuesday morning"), N_("Tuesday afternoon"), N_("Tuesday evening")],
    [N_("Wednesday night"), N_("Wednesday morning"), N_("Wednesday afternoon"), N_("Wednesday evening")],
    [N_("Thursday night"), N_("Thursday morning"), N_("Thursday afternoon"), N_("Thursday evening")],
    [N_("Friday night"), N_("Friday morning"), N_("Friday afternoon"), N_("Friday evening")],
    [N_("Saturday night"), N_("Saturday morning"), N_("Saturday afternoon"), N_("Saturday evening")],
    [N_("Sunday night"), N_("Sunday morning"), N_("Sunday afternoon"), N_("Sunday evening")],
];

const TODAY_PARTS = [N_("Tonight"), N_("This morning"), N_("This afternoon"), N_("This evening")];
const TOMORROW_PARTS = [N_("Tomorrow night"), N_("Tomorrow morning"), N_("Tomorrow afternoon"), N_("Tomorrow evening")];

function getDatetimePart(datetime) {
    let h = datetime.get_hour();

    // 0-5: late night -> filtered out
    // 5-12: morning
    // 12-18: afternoon
    // 18-21: evening
    // 21-24: night

    if (h < 5)
        return -1;
    else if (h < 12)
        return 1;
    else if (h < 18)
        return 2;
    else if (h < 21)
        return 3;
    else
        return 0;
}

function formatToday(datetime) {
    let part = getDatetimePart(datetime);
    return Gettext.gettext(TODAY_PARTS[part]);
}

function formatTomorrow(datetime) {
    let part = getDatetimePart(datetime);
    return Gettext.gettext(TOMORROW_PARTS[part]);
}

function formatDayPart(datetime) {
    let day = datetime.get_day_of_week() - 1;
    let part = getDatetimePart(datetime);

    return Gettext.gettext(DAY_PARTS[day][part]);
}
