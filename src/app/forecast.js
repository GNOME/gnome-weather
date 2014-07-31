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

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const Params = imports.misc.params;
const Strings = imports.shared.strings;
const Util = imports.misc.util;

// In microseconds
const ONE_HOUR = 3600*1000*1000;

const ForecastBox = new Lang.Class({
    Name: 'ForecastBox',
    Extends: Gtk.Frame,

    _init: function(params) {
        params = Params.fill(params, { shadow_type: Gtk.ShadowType.NONE });
        this.parent(params);
        this.get_accessible().accessible_name = _("Forecast");

        this._settings = new Gio.Settings({ schema_id: 'org.gnome.desktop.interface' });

        this._grid = new Gtk.Grid({ orientation: Gtk.Orientation.HORIZONTAL,
                                    column_spacing: 18,
                                    row_spacing: 6,
                                    margin_top: 12,
                                    margin_bottom: 12,
                                    column_homogeneous: true });
        this.add(this._grid);
    },

    // Ensure that infos are sufficiently spaced, and
    // remove infos for the wrong day
    _preprocess: function(now, infos) {
        let ret = [];
        let i;
        let current;

        // First ignore all infos that are on a different
        // day than now.
        // infos are ordered by time, and it's assumed at some point
        // there is an info for the current day (otherwise, nothing
        // is shown)
        for (i = 0; i < infos.length; i++) {
            let info = infos[i];

            let [ok, date] = info.get_value_update();
            let datetime = GLib.DateTime.new_from_unix_local(date);

            if (Util.arrayEqual(now.get_ymd(), datetime.get_ymd())) {
                current = datetime;
                break;
            }
        }

        for ( ; i < infos.length; i++) {
            let info = infos[i];

            let [ok, date] = info.get_value_update();
            let datetime = GLib.DateTime.new_from_unix_local(date);
            if (datetime.difference(current) < ONE_HOUR)
                continue;

            if (!Util.arrayEqual(now.get_ymd(),
                                 datetime.get_ymd()))
                break;

            ret.push(info);
            current = datetime;
        }

        return ret;
    },

    update: function(infos, day) {
        if (infos.length > 0) {
            let now = GLib.DateTime.new_now_local();
            if (day == "tomorrow-button")
                now = now.add_days(1);
            let dayInfo = this._preprocess(now, infos);

            if (dayInfo.length == 0) {
                now = now.add_hours(-2);
                dayInfo = this._preprocess(now, infos);
            }

            for (let i = 0; i < dayInfo.length; i++) {
                let info = dayInfo[i];
                this._addOneInfo(info, i);
            }
        } else {
            let label = new Gtk.Label({ label: _("Forecast not available"),
                                        use_markup: true,
                                        visible: true });
            this._grid.attach(label, 0, 0, 1, 1);
        }
    },

    _addOneInfo: function(info, col) {
        let [ok, date] = info.get_value_update();
        let datetime = GLib.DateTime.new_from_unix_local(date);

        let timeSetting = this._settings.get_string('clock-format');
        let timeFormat = null;

        if (timeSetting == '12h')
            // Translators: this is a time format without date used for AM/PM
            timeFormat = _("%l∶%M %p");
        else
            // Translators: this is a time format without date used for 24h mode
            timeFormat = _("%R");

        let label = new Gtk.Label({ label: datetime.format(timeFormat),
                                    use_markup: true,
                                    visible: true });
        this._grid.attach(label, col, 0, 1, 1);

        let image = new Gtk.Image({ icon_name: info.get_symbolic_icon_name(),
                                    pixel_size: 32,
                                    margin_start: 10,
                                    margin_end: 10,
                                    use_fallback: true,
                                    visible: true });
        this._grid.attach(image, col, 1, 1, 1);

        let temperature = new Gtk.Label({ label: Util.getTemperature(info),
                                          visible: true });
        this._grid.attach(temperature, col, 2, 1, 1);
    },

    clear: function() {
        this._grid.foreach(function(w) { w.destroy(); });
    }
});
