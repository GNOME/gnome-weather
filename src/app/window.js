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
const CurrentLocationController = imports.app.currentLocationController;
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
        this.currentInfo = null;
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

        this._worldView = new WorldView.WorldContentView(this.application, this, { visible: true });
        this._worldView.hide();

        this._model = this._worldView.model;

        this._searchView = builder.get_object('initial-grid');

        this._searchEntry = builder.get_object('initial-grid-location-entry');
        this._searchEntry.connect('notify::location', Lang.bind(this, this._searchLocationChanged));

        let placesButton = builder.get_object('places-button');
        this._pageWidgets[Page.CITY].push(placesButton);

        placesButton.set_popover(this._worldView);

        let refresh = builder.get_object('refresh-button');
        this._pageWidgets[Page.CITY].push(refresh);

        this._stack = builder.get_object('main-stack');

        this._cityView = new City.WeatherView({ hexpand: true,
                                                vexpand: true });
        this._stack.add(this._cityView);

        this._stack.set_visible_child(this._searchView);

        this.add(grid);
        grid.show_all();

        for (let i = 0; i < this._pageWidgets[Page.CITY].length; i++)
            this._pageWidgets[Page.CITY][i].hide();

        this._showingDefault = false;
    },

    update: function() {
        this._cityView.update();
    },

    _searchLocationChanged: function(entry) {
        if (entry.location) {
            let info = this._model.addNewLocation(entry.location, false);
            this.showInfo(info, false);
        }
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

    showDefault: function() {
        this._showingDefault = true;
        let clc = this.application.currentLocationController;
        let autoLocation = clc.autoLocation;
        let currentLocation = clc.currentLocation;
        if (currentLocation)
            this.showInfo(this._model.getCurrentLocation(), false);
        else if (autoLocation != CurrentLocationController.AutoLocation.ENABLED)
            this.showInfo(this._model.getRecent(), false);
    },

    showSearch: function(text) {
        this._showingDefault = false;
        this._cityView.setTimeVisible(false);
        this._stack.set_visible_child(this._searchView);
        this._goToPage(Page.SEARCH);
        this._searchEntry.text = text;
        if (text.length > 0)
            this._searchEntry.get_completion().complete();
    },

    showInfo: function(info, isCurrentLocation) {
        if (!info) {
            if (isCurrentLocation && this._showingDefault)
                this.showDefault();
            return;
        }

        /*
         * Only show location updates if we have no loaded info and no
         * search text or if we are currently showing the previous
         * current location.
         */
        if (isCurrentLocation) {
            if (this._currentPage == Page.CITY) {
                if (!this._cityView.info._isCurrentLocation)
                    return;
            } else if (this._currentPage == Page.SEARCH) {
                if (this._searchEntry.text.length > 0)
                    return;
            }
        }

        this._showingDefault = false;
        this.currentInfo = info;
        this._cityView.info = info;

        let isCurrentTimezone = false;
        let currentLocation = this.application.currentLocationController.currentLocation;
        if (currentLocation) {
            isCurrentTimezone = currentLocation.get_timezone().get_tzid() == info.location.get_timezone().get_tzid();
        }
        this._cityView.setTimeVisible(!isCurrentTimezone);

        this._worldView.refilter();
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

        let copyright = 'Copyright 2013-2015 The Weather Developers';
        let attribution = this._cityView.info ? this._cityView.info.get_attribution() : '';
        copyright += attribution ? '\n' + attribution : '';
        let aboutDialog = new Gtk.AboutDialog(
            { artists: artists,
              authors: [ 'Giovanni Campagna <gcampagna@src.gnome.org>' ],
              translator_credits: _("translator-credits"),
              program_name: _("Weather"),
              comments: _("A weather application"),
              license_type: Gtk.License.GPL_2_0,
              logo_icon_name: 'org.gnome.Weather',
              version: pkg.version,
              website: 'https://wiki.gnome.org/Apps/Weather',
              wrap_license: true,
              modal: true,
              transient_for: this,
              use_header_bar: true
            });

        // HACK: we need to poke into gtkaboutdialog internals
        // to set the copyright with markup like attribution requires
        // FIXME: file a gtk+ bug

        let copyrightLabel = aboutDialog.get_template_child(Gtk.AboutDialog, 'copyright_label');
        copyrightLabel.set_markup('<span size="small">' + copyright + '</span>');
        copyrightLabel.show();

        aboutDialog.show();
        aboutDialog.connect('response', function() {
            aboutDialog.destroy();
        });
    },

    _close: function() {
        this.destroy();
    }
});
