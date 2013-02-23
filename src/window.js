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

const View = imports.view;

function makeTitle(location) {
    let city = location;
    if (location.get_level() == GWeather.LocationLevel.WEATHER_STATION)
        city = location.get_parent();

    let country = city.get_parent();
    while (country &&
           country.get_level() > GWeather.LocationLevel.COUNTRY)
        country = country.get_parent();

    if (country)
        return _("%s, %s").format(city.get_name(), country.get_name());
    else
        return city.get_name();
}

const MainWindow = new Lang.Class({
    Name: 'MainWindow',
    Extends: Gtk.ApplicationWindow,
    Properties: {
        'location': GObject.ParamSpec.boxed('location', 'Location', '',
                                            GObject.ParamFlags.READABLE |
                                            GObject.ParamFlags.WRITABLE,
                                            GWeather.Location),
    },

    _init: function(params) {
        params = Params.fill(params, { default_width: 700,
                                       default_height: 500 });
        this.parent(params);

        this._world = this.application.world;
        this._info = new GWeather.Info({ world: this._world,
                                         forecast_type: GWeather.ForecastType.LIST,
                                         enabled_providers: GWeather.Provider.METAR |
                                                            GWeather.Provider.YR_NO });
        this._location = this._info.get_location();

        let grid = new Gtk.Grid({ orientation: Gtk.Orientation.VERTICAL });

        this._header = new Gd.HeaderBar({ title: makeTitle(this._location),
                                          hexpand: true });
        this._search = new Gd.HeaderToggleButton({ symbolic_icon_name: 'edit-find-symbolic' });
        this._header.pack_end(this._search);
        grid.add(this._header);

        this._locationEntry = new GWeather.LocationEntry({ top: this._world,
                                                           location: this._location,
                                                           width_request: 500,
                                                           halign: Gtk.Align.CENTER });
        this._locationEntry.bind_property('location', this, 'location',
                                          GObject.BindingFlags.DEFAULT);

        let toolbar = new Gtk.Toolbar({ hexpand: true });
        toolbar.get_style_context().add_class(Gtk.STYLE_CLASS_PRIMARY_TOOLBAR);
        let item = new Gtk.ToolItem();
        item.set_expand(true);
        item.add(this._locationEntry);
        toolbar.insert(item, 0);

        let revealer = new Gd.Revealer({ reveal_child: false,
                                         child: toolbar });
        this._search.bind_property('active', revealer, 'reveal-child',
                                   GObject.BindingFlags.DEFAULT);
        grid.add(revealer);

        this._view = new View.WeatherView({ info: this._info,
                                            hexpand: true,
                                            vexpand: true });
        grid.add(this._view);

        this.add(grid);
        grid.show_all();

        this._view.beginUpdate();
    },

    get location() {
        return this._location;
    },

    set location(l) {
        this._location = l;
        this._info.location = l;
        this._header.title = makeTitle(l);
        this.update();

        this.notify('location');
    },

    update: function() {
        this._view.beginUpdate();
        this._info.update();
    },
});
