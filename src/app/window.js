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

const Gtk = imports.gi.Gtk;
const GWeather = imports.gi.GWeather;
const Lang = imports.lang;

const City = imports.app.city;
const Params = imports.misc.params;
const World = imports.shared.world;
const WorldView = imports.app.world;
const Util = imports.misc.util;

const Page = {
    SEARCH: 0,
    CITY: 1
};

const MainWindow = new Lang.Class({
    Name: 'MainWindow',
    Extends: Gtk.ApplicationWindow,

    _init: function(params) {
        params = Params.fill(params, { width_request: 700,
                                       height_request: 520 });
        this.parent(params);

        this._world = this.application.world;
        this._currentInfo = null;
        this._currentPage = Page.SEARCH;
        this._pageWidgets = [[],[]];

        Util.initActions(this,
                         [{ name: 'about',
                            activate: this._showAbout },
                          { name: 'close',
                            activate: this._close },
                          { name: 'refresh',
                            activate: this.update }]);

        let builder = new Gtk.Builder();
        builder.add_from_resource('/org/gnome/Weather/Application/window.ui');

        let grid = builder.get_object('main-panel');
        this._header = builder.get_object('header-bar');
        this.set_titlebar(this._header);
        let [title, subtitle] = this._getTitle();
        this._header.title = title;
        this._header.subtitle = subtitle;

        this._worldView = new WorldView.WorldContentView(this.application, { visible: true });
        this._worldView.hide();

        this._model = this._worldView.model;
        this._model.connect('show-info', Lang.bind(this, function(model, info) {
            if (info)
                this.showInfo(info);
            else
                this.showSearch(info);
        }));

        let initialGrid = builder.get_object('initial-grid');

        let initialGridLocEntry = builder.get_object('initial-grid-location-entry');
        initialGridLocEntry.connect('notify::location', Lang.bind(this, this._initialLocationChanged));

        let placesButton = builder.get_object('places-button');
        this._pageWidgets[Page.CITY].push(placesButton);

        placesButton.set_popover(this._worldView);

        let refresh = builder.get_object('refresh-button');
        this._pageWidgets[Page.CITY].push(refresh);

        this._stack = builder.get_object('main-stack');

        this._cityView = new City.WeatherView({ hexpand: true,
                                                vexpand: true });
        this._stack.add(this._cityView);

        this._stack.set_visible_child(initialGrid);

        this.add(grid);
        grid.show_all();

        for (let i = 0; i < this._pageWidgets[Page.CITY].length; i++)
            this._pageWidgets[Page.CITY][i].hide();

        let autoLocation = this.application.currentLocationController.autoLocation;
        if (!autoLocation)
            this._model.showRecent();
    },

    update: function() {
        this._cityView.update();
    },

    _initialLocationChanged: function(entry) {
        if (entry.location)
            this._model.addNewLocation(entry.location, false);
    },

    _getTitle: function() {
        if (this._currentPage == Page.SEARCH)
            return [_("Select Location"), null];

        let location = this._cityView.info.location;
        let city = location;
        if (location.get_level() == GWeather.LocationLevel.WEATHER_STATION)
            city = location.get_parent();

        let country = city.get_parent();
        while (country &&
               country.get_level() > GWeather.LocationLevel.COUNTRY)
            country = country.get_parent();

        if (country)
            return [city.get_name(), country.get_name()];
        else
            return [city.get_name(), null];
    },

    _goToPage: function(page) {
        for (let i = 0; i < this._pageWidgets[this._currentPage].length; i++)
            this._pageWidgets[this._currentPage][i].hide();

        for (let i = 0; i < this._pageWidgets[page].length; i++) {
            let widget = this._pageWidgets[page][i];
            if (!widget.no_show_all)
                this._pageWidgets[page][i].show();
        }

        this._currentPage = page;

        let [title, subtitle] = this._getTitle();
        this._header.title = title;
        this._header.subtitle = subtitle;
    },

    showSearch: function() {
        this._goToPage(Page.SEARCH);
    },

    showInfo: function(info) {
        this._cityView.info = info;
        this._cityView.disconnectClock();

        let isCurrentLocation = false;
        let currentLocation = this.application.currentLocationController.currentLocation;
        if (currentLocation) {
            isCurrentLocation = currentLocation.get_timezone().get_tzid() == info.location.get_timezone().get_tzid();
        }
        if (isCurrentLocation) {
            this._cityView.infoPage.timeGrid.hide();
        } else {
            this._cityView.connectClock();
            this._cityView.infoPage.timeGrid.show();
        }

        this._stack.set_visible_child(this._cityView);
        this._goToPage(Page.CITY);
    },

    _showAbout: function() {
        let artists = [ 'Jakub Steiner <jimmac@gmail.com>',
                        'Pink Sherbet Photography (D. Sharon Pruitt)',
                        'Elliott Brown',
                        'Analogick',
                        'DBduo Photography (Daniel R. Blume)',
                        'davharuk',
                        'Tech Haven Ministries',
                        'Jim Pennucci' ];
        let aboutDialog = new Gtk.AboutDialog(
            { artists: artists,
              authors: [ 'Giovanni Campagna <gcampagna@src.gnome.org>' ],
              translator_credits: _("translator-credits"),
              program_name: _("Weather"),
              comments: _("A weather application"),
              copyright: 'Copyright 2013 The Weather Developers',
              license_type: Gtk.License.GPL_2_0,
              logo_icon_name: 'org.gnome.Weather.Application',
              version: pkg.version,
              website: 'https://wiki.gnome.org/Apps/Weather',
              wrap_license: true,
              modal: true,
              transient_for: this,
              use_header_bar: true
            });

        aboutDialog.show();
        aboutDialog.connect('response', function() {
            aboutDialog.destroy();
        });
    },

    _close: function() {
        this.destroy();
    }
});
