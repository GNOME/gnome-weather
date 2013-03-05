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

const City = imports.city;
const World = imports.world;

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

const Page = {
    WORLD: 0,
    CITY: 1
};

const MainWindow = new Lang.Class({
    Name: 'MainWindow',
    Extends: Gtk.ApplicationWindow,

    _init: function(params) {
        params = Params.fill(params, { hide_titlebar_when_maximized: true,
                                       width_request: 700,
                                       height_request: 520 });
        this.parent(params);

        this._world = this.application.world;
        this._model = new World.WorldModel(this._world);
        this._currentInfo = null;
        this._currentPage = Page.WORLD;
        this._pageWidgets = [[],[]];

        let grid = new Gtk.Grid({ orientation: Gtk.Orientation.VERTICAL });

        this._header = new Gd.HeaderBar({ hexpand: true });
        grid.add(this._header);

        let newButton = new Gd.HeaderSimpleButton({ label: _("New") });
        newButton.connect('clicked', Lang.bind(this, this._newLocation));
        this._header.pack_start(newButton);
        this._pageWidgets[Page.WORLD].push(newButton);

        let goWorldButton = new Gd.HeaderSimpleButton({ label: _("World Weather") });
        goWorldButton.connect('clicked', Lang.bind(this, this._goWorld));
        this._header.pack_start(goWorldButton);
        this._pageWidgets[Page.CITY].push(goWorldButton);

        let refresh = new Gd.HeaderSimpleButton({ symbolic_icon_name: 'view-refresh-symbolic' });
        refresh.connect('clicked', Lang.bind(this, this.update));
        this._header.pack_end(refresh);
        this._pageWidgets[Page.CITY].push(refresh);

        let select = new Gd.HeaderToggleButton({ symbolic_icon_name: 'object-select-symbolic' });
        this._header.pack_end(select);
        this._pageWidgets[Page.WORLD].push(select);

        this._stack = new Gd.Stack();

        this._cityView = new City.WeatherView({ hexpand: true,
                                                vexpand: true });
        this._stack.add(this._cityView);

        this._worldView = new Gd.MainView({ view_type: Gd.MainViewType.ICON });
        this._worldView.model = this._model;
        this._worldView.connect('item-activated', Lang.bind(this, this._itemActivated));
        this._worldView.connect('selection-mode-request', function() {
            select.active = true;
        });
        select.bind_property('active', this._worldView, 'selection-mode',
                             GObject.BindingFlags.DEFAULT);
        this._stack.add(this._worldView);

        this._stack.set_visible_child(this._worldView);
        grid.add(this._stack);

        this.add(grid);
        grid.show_all();

        for (let i = 0; i < this._pageWidgets[Page.CITY].length; i++)
            this._pageWidgets[Page.CITY][i].hide();
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
        this._cityView.update();
    },

    _getTitle: function() {
        if (this._currentPage == Page.WORLD)
            return '';

        return makeTitle(this._cityView.info.location);
    },

    _goToPage: function(page) {
        if (page == this._currentPage)
            return;

        for (let i = 0; i < this._pageWidgets[this._currentPage].length; i++)
            this._pageWidgets[this._currentPage][i].hide();

        for (let i = 0; i < this._pageWidgets[page].length; i++)
            this._pageWidgets[page][i].show();

        this._currentPage = page;
        this._header.title = this._getTitle();
    },

    _itemActivated: function(view, id, path) {
        let [ok, iter] = this._model.get_iter(path);
        let info = this._model.get_value(iter, World.Columns.INFO);

        this._cityView.info = info;
        this._stack.set_visible_child(this._cityView);
        this._goToPage(Page.CITY);
    },

    _goWorld: function() {
        this._cityView.info = null;
        this._stack.set_visible_child(this._worldView);
        this._goToPage(Page.WORLD);
    },

    _newLocation: function() {
        let dialog = new Gtk.Dialog({ title: _("New Location"),
                                      transient_for: this.get_toplevel(),
                                      modal: true });
        let entry = new GWeather.LocationEntry({ top: this._world });

        dialog.get_content_area().add(entry);
        dialog.add_button('gtk-add', Gtk.ResponseType.OK);

        dialog.connect('response', Lang.bind(this, function(dialog, response) {
            dialog.destroy();

            if (response != Gtk.ResponseType.OK)
                return;

            let location = entry.location;
            if (!location)
                return;

            this._model.addLocation(entry.location);
        }));
        dialog.show_all();
    }
});
