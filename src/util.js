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

function loadUI(resource, scope) {
    // Normalize scope to be an object or the global object
    scope = scope || window;

    let ui = new Gtk.Builder();
    if (scope instanceof GObject.Object)
        ui.expose_object('scope', scope);

    ui.add_from_resource(resource);
    ui.connect_signals_full(function(builder, object, signal_name, handler_name, connect_object, flags) {
        let realHandler;
        if (handler_name.substr(0, 11) == 'javascript:') {
            realHandler = new Function('object', handler_name.substr(11));
        } else {
            realHandler = scope[handler_name];
        }

        let handler;
        if (connect_object) {
            if (flags & GObject.ConnectFlags.SWAPPED) {
                handler = function () {
                    let args = [connect_object].concat(Array.prototype.slice.call(arguments, 1)).concat(arguments[0]);
                    return realHandler.apply(scope, args);
                }
            } else {
                handler = Lang.bind(scope, realHandler, connect_object);
            }
        } else {
            handler = Lang.bind(scope, realHandler);
        }

        if (flags & GObject.ConnectFlags.AFTER)
            object.connect_after(signal_name, handler);
        else
            object.connect(signal_name, handler);
    });

    return ui;
}

function loadStyleSheet(resource) {
    let file = Gio.file_new_for_uri('resource://' + resource);
    let provider = new Gtk.CssProvider();
    provider.load_from_file(file);
    Gtk.StyleContext.add_provider_for_screen(Gdk.Screen.get_default(),
                                             provider,
                                             Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
}

function initActions(actionMap, simpleActionEntries) {
    simpleActionEntries.forEach(function(entry) {
        let action = new Gio.SimpleAction({ name: entry.name });

        if (entry.callback)
            action.connect('activate', Lang.bind(actionMap, entry.callback));

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
