// -*- Mode: js; indent-tabs-mode: nil; c-basic-offset: 4; tab-width: 4 -*-
//
// Copyright (c) 2013 Giovanni Campagna <scampa.giovanni@gmail.com>
//
// Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//   * Redistributions of source code must retain the above copyright
//     notice, this list of conditions and the following disclaimer.
//   * Redistributions in binary form must reproduce the above copyright
//     notice, this list of conditions and the following disclaimer in the
//     documentation and/or other materials provided with the distribution.
//   * Neither the name of the GNOME Foundation nor the
//     names of its contributors may be used to endorse or promote products
//     derived from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
// ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
// WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE LIABLE FOR ANY
// DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
// ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
// SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import GWeather from 'gi://GWeather';

import * as System from 'system';

function loadUI(
    resourcePath: string,
    objects: {[x: string]: GObject.Object}
): Gtk.Builder {
    const ui = new Gtk.Builder();

    if (objects) {
        for (const o in objects) ui.expose_object(o, objects[o]);
    }

    ui.add_from_resource(resourcePath);
    return ui;
}

function arrayEqual<T>(one: T[], two: T[]): boolean {
    if (one.length !== two.length) return false;

    return one.every((a, i) => a === two[i]);
}

function getSettings(schemaId: string): Gio.Settings {
    const schemaSource = Gio.SettingsSchemaSource.get_default();
    const schemaObj = schemaSource?.lookup(schemaId, true);

    if (!schemaObj) {
        log(`Missing GSettings schema ${schemaId}`);
        System.exit(1);
    }

    return new Gio.Settings({settings_schema: schemaObj});
}

function getWeatherConditions(info: GWeather.Info): string {
    let conditions = info.get_conditions();
    if (conditions == '-')
        // Not significant
        conditions = info.get_sky();
    return conditions;
}

function normalizeCasefoldAndUnaccent(str: string | null): string {
    if (!str) return '';

    // The one and only!
    // Travelled all over gnome, from tracker to gnome-shell to gnome-control-center,
    // to seahorse, epiphany...
    //
    // Originally written by Aleksander Morgado <aleksander@gnu.org>

    str = GLib.utf8_normalize(str, -1, GLib.NormalizeMode.NFKD) ?? '';
    str = GLib.utf8_casefold(str, -1);

    /* Combining diacritical mark?
     *  Basic range: [0x0300,0x036F]
     *  Supplement:  [0x1DC0,0x1DFF]
     *  For Symbols: [0x20D0,0x20FF]
     *  Half marks:  [0xFE20,0xFE2F]
     */
    return str.replace(
        /[\u0300-\u036f]|[\u1dc0-\u1dff]|[\u20d0-\u20ff]|[\ufe20-\ufe2f]/,
        ''
    );
}

function getTemperature(info: GWeather.Info): string {
    const [ok1] = info.get_value_temp_min(GWeather.TemperatureUnit.DEFAULT);
    const [ok2] = info.get_value_temp_max(GWeather.TemperatureUnit.DEFAULT);

    if (ok1 && ok2) {
        /* TRANSLATORS: this is the temperature string, minimum and maximum.
           The two values are already formatted, so it would be something like
           "7 °C / 19 °C" */
        return _('%s / %s').format(info.get_temp_min(), info.get_temp_max());
    } else {
        return info.get_temp_summary();
    }
}

function getEnabledProviders(): number {
    return (
        GWeather.Provider.METAR |
        GWeather.Provider.MET_NO |
        GWeather.Provider.OWM
    );
}

function easeOutCubic(value: number): number {
    const t = value - 1;
    return t * t * t + 1;
}

function getNight(date: GLib.DateTime): GLib.DateTime {
    return GLib.DateTime.new_local(
        date.get_year(),
        date.get_month(),
        date.get_day_of_month(),
        2,
        0,
        0
    );
}

function getMorning(date: GLib.DateTime): GLib.DateTime {
    return GLib.DateTime.new_local(
        date.get_year(),
        date.get_month(),
        date.get_day_of_month(),
        7,
        0,
        0
    );
}

function getDay(date: GLib.DateTime): GLib.DateTime {
    return GLib.DateTime.new_local(
        date.get_year(),
        date.get_month(),
        date.get_day_of_month(),
        12,
        0,
        0
    );
}

function getAfternoon(date: GLib.DateTime): GLib.DateTime {
    return GLib.DateTime.new_local(
        date.get_year(),
        date.get_month(),
        date.get_day_of_month(),
        17,
        0,
        0
    );
}

function getEvening(date: GLib.DateTime): GLib.DateTime {
    return GLib.DateTime.new_local(
        date.get_year(),
        date.get_month(),
        date.get_day_of_month(),
        22,
        0,
        0
    );
}

function getDateTime(info: GWeather.Info): GLib.DateTime {
    const [, date] = info.get_value_update();
    return GLib.DateTime.new_from_unix_local(date);
}

function getTemp(info: GWeather.Info): number {
    const [, temp] = info.get_value_temp(GWeather.TemperatureUnit.DEFAULT);
    return temp;
}

function formatTemperature(value: number): string {
    return `${Math.round(value).toFixed(0)}°`;
}

function getTempString(info: GWeather.Info): string {
    try {
        const [, temp] = info.get_value_temp(GWeather.TemperatureUnit.DEFAULT);
        return formatTemperature(temp);
    } catch {
        return '';
    }
}

function getNameAndCountry(
    location: GWeather.Location
): [string] | [string, string] {
    let country = location.get_parent();
    while (country && country.get_level() > GWeather.LocationLevel.COUNTRY)
        country = country.get_parent();

    if (country) return [location.get_name() ?? '', country.get_name() ?? ''];
    else return [location.get_name() ?? ''];
}

export {
    loadUI,
    formatTemperature,
    getDateTime,
    getTemp,
    getEvening,
    getAfternoon,
    getTempString,
    getNight,
    normalizeCasefoldAndUnaccent,
    arrayEqual,
    getSettings,
    getMorning,
    getTemperature,
    getDay,
    easeOutCubic,
    getEnabledProviders,
    getWeatherConditions,
    getNameAndCountry,
};
