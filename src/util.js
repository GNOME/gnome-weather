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

function loadUI(file) {
    file = file || 'main.ui';

    let ui = new Gtk.Builder();
    ui.add_from_file(GLib.build_filenamev([pkg.pkgdatadir,
                                           file]));
    return ui;
}

function loadStyleSheet(file) {
    file = file || 'application.css';

    let provider = new Gtk.CssProvider();
    provider.load_from_path(GLib.build_filenamev([pkg.pkgdatadir,
                                                  file]));
    Gtk.StyleContext.add_provider_for_screen(Gdk.Screen.get_default(),
                                             provider,
                                             Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
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

    if (pkg.moduledir != pkg.pkgdatadir) {
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

if (!GWeather.Info.prototype.get_symbolic_icon_name) {
    GWeather.Info.prototype.get_symbolic_icon_name = function() {
        let icon = this.get_icon_name().split('-');

        // If the icon is for a moonphase it ends like -000
        // Replace the moonphase with -symbolic
        if (!isNaN(icon[icon.length-1]))
            icon[icon.length-1] = 'symbolic';
        else
            icon.push('symbolic');

        return icon.join('-');
    }
}
