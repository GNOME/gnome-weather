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

const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const System = imports.system;
const GWeather = imports.gi.GWeather;

const Params = imports.misc.params;

function loadUI(resourcePath, objects) {
    let ui = new Gtk.Builder();

    if (objects) {
        for (let o in objects)
            ui.expose_object(o, objects[o]);
    }

    ui.add_from_resource(resourcePath);
    return ui;
}

function loadStyleSheet(resource) {
    let provider = new Gtk.CssProvider();
    provider.load_from_file(Gio.File.new_for_uri('resource://' + resource));
    Gtk.StyleContext.add_provider_for_screen(Gdk.Screen.get_default(),
                                             provider,
                                             Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
}

function initActions(actionMap, simpleActionEntries, context) {
    simpleActionEntries.forEach(function(entry) {
        let filtered = Params.filter(entry, { activate: null,
                                              state_changed: null,
                                              context: null });
        let action = new Gio.SimpleAction(entry);

        let context = filtered.context || actionMap;
        if (filtered.activate)
            action.connect('activate', filtered.activate.bind(context));
        if (filtered.state_changed)
            action.connect('state-changed', filtered.state_changed.bind(context));

        actionMap.add_action(action);
    });
}

function arrayEqual(one, two) {
    if (one.length != two.length)
        return false;

    for (let i = 0; i < one.length; i++)
        if (one[i] != two[i])
            return false;

    return true;
}

function getSettings(schemaId, path) {
    const GioSSS = Gio.SettingsSchemaSource;
    let schemaSource;

    if (!pkg.moduledir.startsWith('resource://')) {
        // Running from the source tree
        schemaSource = GioSSS.new_from_directory(pkg.pkgdatadir,
                                                 GioSSS.get_default(),
                                                 false);
    } else {
        schemaSource = GioSSS.get_default();
    }

    let schemaObj = schemaSource.lookup(schemaId, true);
    if (!schemaObj) {
        log('Missing GSettings schema ' + schemaId);
        System.exit(1);
    }

    if (path === undefined)
        return new Gio.Settings({ settings_schema: schemaObj });
    else
        return new Gio.Settings({ settings_schema: schemaObj,
                                  path: path });
}

function loadIcon(iconName, size) {
    let theme = Gtk.IconTheme.get_default();

    return theme.load_icon(iconName,
                           size,
                           Gtk.IconLookupFlags.GENERIC_FALLBACK);
}

function getWeatherConditions(info) {
    let conditions = info.get_conditions();
    if (conditions == '-') // Not significant
        conditions = info.get_sky();
    return conditions;
}

function isCdm(c) {
    return ((c >= 0x0300 && c <= 0x036F) ||
        (c >= 0x1DC0 && c <= 0x1DFF)  ||
        (c >= 0x20D0 && c <= 0x20FF)  ||
        (c >= 0xFE20 && c <= 0xFE2F));
}

function normalizeCasefoldAndUnaccent(str) {
    // The one and only!
    // Travelled all over gnome, from tracker to gnome-shell to gnome-control-center,
    // to seahorse, epiphany...
    //
    // Originally written by Aleksander Morgado <aleksander@gnu.org>

    str = GLib.utf8_normalize(str, -1, GLib.NormalizeMode.NFKD);
    str = GLib.utf8_casefold(str, -1);

    /* Combining diacritical mark?
     *  Basic range: [0x0300,0x036F]
     *  Supplement:  [0x1DC0,0x1DFF]
     *  For Symbols: [0x20D0,0x20FF]
     *  Half marks:  [0xFE20,0xFE2F]
     */
    return str.replace(/[\u0300-\u036f]|[\u1dc0-\u1dff]|[\u20d0-\u20ff]|[\ufe20-\ufe2f]/, '');
}

function getTemperature(info) {
    let [ok1, ] = info.get_value_temp_min(GWeather.TemperatureUnit.DEFAULT);
    let [ok2, ] = info.get_value_temp_max(GWeather.TemperatureUnit.DEFAULT);

    if (ok1 && ok2) {
        // TRANSLATORS: this is the temperature string, minimum and maximum.
        // The two values are already formatted, so it would be something like
        // "7 °C / 19 °C"
        return _("%s / %s").format(info.get_temp_min(), info.get_temp_max());
    } else {
        return info.get_temp_summary();
    }
}

function getEnabledProviders() {
    let provider_override = GLib.getenv('GWEATHER_DEBUG_BACKEND');
    if (provider_override) {
        return (GWeather.Provider.METAR | GWeather.Provider[provider_override]);
    } else {
        return (GWeather.Provider.METAR | GWeather.Provider.YR_NO | GWeather.Provider.OWM);
    }
}
