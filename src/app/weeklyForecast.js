// -*- Mode: js; indent-tabs-mode: nil; c-basic-offset: 4; tab-width: 4 -*-
//
// Copyright (c) 2014 Saurabh Patel <srp201201051@gmail.com>
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

const WeeklyForecastFrame = new Lang.Class({
    Name: 'WeeklyForecastFrame',
    Extends: Gtk.Frame,

    _init: function(params) {
        params = Params.fill(params, { shadow_type: Gtk.ShadowType.NONE,
                                       name: 'weekly-forecast-frame',
                                       width_request: 220 });
        this.parent(params);
        this.get_accessible().accessible_name = _("Weekly Forecast");

        this._settings = new Gio.Settings({ schema_id: 'org.gnome.desktop.interface' });

        this._grid = new Gtk.Grid({ orientation: Gtk.Orientation.VERTICAL,
                                    margin: 24,
                                    valign: Gtk.Align.START,
                                    halign: Gtk.Align.START,
                                    row_spacing: 25,
                                    row_homogeneous: true });

        this.add(this._grid);
    },

    // get infos for the correct day
    _preprocess: function(infos, day) {
        let ret = [];
        let i;

        // First ignore all infos that are on a different
        // older than day.
        // infos are ordered by time, and it's assumed at some point
        // there is an info for the day (otherwise, nothing
        // is shown)
        for (i = 0; i < infos.length; i++) {
            let info = infos[i];

            let [ok, date] = info.get_value_update();
            let datetime = GLib.DateTime.new_from_unix_local(date);

            if (Util.arrayEqual(day.get_ymd(), datetime.get_ymd())) {
                break;
            }
        }

        let infoCount = 0;
        while (i < infos.length && infoCount < 5) {
            let count = 0;
            let temp = [];
            for ( ; i < infos.length; i++) {
                let info = infos[i];
                let [ok, date] = info.get_value_update();
                let datetime = GLib.DateTime.new_from_unix_local(date);

                if (!Util.arrayEqual(day.get_ymd(),
                                     datetime.get_ymd()))
                    break;

                temp[count++] = info;
            }
            if (count > 0)
                ret.push(temp[Math.floor(count/2)]);
            day = day.add_days(1);
            infoCount++;
        }
        return ret;
    },

    update: function(infos) {
        let day = GLib.DateTime.new_now_local();
        day = day.add_days(2);

        let weeklyInfo = this._preprocess(infos, day);
        this.clear();

        for (let i = 0; i < weeklyInfo.length; i++) {
            let info = weeklyInfo[i];
            let [ok, date] = info.get_value_update();
            let datetime = GLib.DateTime.new_from_unix_local(date);

            // Translators: this is the time format for full weekday name according to the current locale
            let timeFormat = _("%A");

            let grid = new Gtk.Grid({ orientation: Gtk.Orientation.HORIZONTAL,
                                      row_spacing: 5,
                                      column_spacing: 10 });

            let label = new Gtk.Label({ label: datetime.format(timeFormat).bold(),
                                        use_markup: true,
                                        halign: Gtk.Align.START,
                                        visible: true });
            grid.attach(label, 0, 0, 2, 1);

            let image = new Gtk.Image({ icon_name: info.get_symbolic_icon_name(),
                                        icon_size: Gtk.IconSize.DIALOG,
                                        use_fallback: true,
                                        halign: Gtk.Align.START,
                                        visible: true });
            grid.attach(image, 0, 1, 1, 1);

            let temperature = new Gtk.Label({ label: Util.getTemperature(info),
                                              halign: Gtk.Align.START,
                                              valign: Gtk.Align.START,
                                              visible: true });
            grid.attach(temperature, 1, 1, 1, 1);
            grid.show();
            this._grid.attach(grid, 0, i, 1, 1);
        }
    },

    clear: function() {
        this._grid.foreach(function(w) { w.destroy(); });
    }
});
