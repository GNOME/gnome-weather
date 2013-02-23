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

const ConditionsSidebar = new Lang.Class({
    Name: 'ConditionsSidebar',
    Extends: Gtk.Grid,

    _init: function(params) {
        params = Params.fill(params, { orientation: Gtk.Orientation.VERTICAL });
        this.parent(params);
        this.get_style_context().add_class('white-background');

        let title = new Gtk.Label({ label: '<b>' + _("Current conditions:") + '</b>',
                                    use_markup: true,
                                    xalign: 0.0,
                                    wrap: true });
        this.add(title);

        this._conditions = new Gtk.Label({ xalign: 0.0, wrap: true });
        this.add(this._conditions);

        this._temperature = new Gtk.Label({ xalign: 0.0, wrap: true });
        this.add(this._temperature);

        this._wind = new Gtk.Label({ xalign: 0.0, wrap: true });
        this.add(this._wind);

        this._attribution = new Gtk.Label({ use_markup: true,
                                            xalign: 0.0,
                                            wrap: true,
                                            max_width_chars: 30 });
        this.add(this._attribution);
        this.show_all();
    },

    update: function(info) {
        this._conditions.label = info.get_weather_summary();
        this._temperature.label = _("Temperature: ") +
            info.get_temp_summary();
        this._wind.label = _("Wind: ") + info.get_wind();

        let attr = info.get_attribution();
        if (attr) {
            this._attribution.label = attr;
            this._attribution.show();
        } else {
            this._attribution.hide();
        }
    }
});

