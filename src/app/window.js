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

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import * as City from './city.js';
import { WorldContentView } from './world.js';

const Page = {
    SEARCH: 0,
    CITY: 1
};

export const MainWindow = GObject.registerClass({
    Template: 'resource:///org/gnome/Weather/window.ui',
    InternalChildren: ['header', 'refreshRevealer', 'refresh', 'forecastStackSwitcher', 'stack',
        'searchButton', 'searchView', 'searchViewStatus', 'forecastStackSwitcherBar', 'cityBox', 'cityBin']
}, class MainWindow extends Adw.ApplicationWindow {
    constructor(params) {
        super(params);

        this._world = this.application.world;
        this.currentInfo = null;
        this._currentPage = Page.SEARCH;
        this._pageWidgets = [[], []];

        let aboutAction = new Gio.SimpleAction({
            enabled: true,
            name: 'about'
        });
        aboutAction.connect('activate', () => this._showAbout());
        this.add_action(aboutAction);

        let refreshAction = new Gio.SimpleAction({
            enabled: true,
            name: 'refresh'
        });
        refreshAction.connect('activate', () => this.update());
        this.add_action(refreshAction);

        this._model = this.application.model;

        this._searchViewStatus.icon_name = pkg.name;

        this._worldView = new WorldContentView(this.application, this, {
            align: Gtk.Align.CENTER,
        });
        this._searchButton.set_popover(this._worldView);

        this._pageWidgets[Page.CITY].push(this._refresh);

        this._cityView = new City.WeatherView(this.application, this,
            { hexpand: true, vexpand: true });

        this._cityBin.set_child(this._cityView);

        this._forecastStackSwitcher.stack = this._cityView.getForecastStack();
        this._forecastStackSwitcherBar.stack = this._cityView.getForecastStack();

        this._stack.set_visible_child(this._searchView);

        for (let i = 0; i < this._pageWidgets[Page.CITY].length; i++)
            this._pageWidgets[Page.CITY][i].hide();

        if (pkg.name.endsWith('Devel')) {
            let ctx = this.get_style_context();
            ctx.add_class('devel');
        }

        this._showingDefault = false;
    }

    vfunc_unroot() {
        this._cityView.unparent();
        this._cityView = null;

        this._worldView.unparent();
        this._worldView = null;

        super.vfunc_unroot();
    }

    update() {
        this._cityView.update();
    }

    _goToPage(page) {
        for (let i = 0; i < this._pageWidgets[this._currentPage].length; i++)
            this._pageWidgets[this._currentPage][i].hide();

        for (let i = 0; i < this._pageWidgets[page].length; i++) {
            this._pageWidgets[page][i].show();
        }

        this._currentPage = page;
    }

    showDefault() {
        this._showingDefault = true;
        this._refreshRevealer.reveal_child = false;

        let mostRecent = this._model.getRecent();
        if (mostRecent)
            this.showInfo(mostRecent);
        else
            this.showSearch();
    }

    showSearch(text) {
        this._showingDefault = false;
        this._refreshRevealer.reveal_child = true;
        this._stack.set_visible_child(this._searchView);
        this._goToPage(Page.SEARCH);
    }

    showInfo(info) {
        if (!info) {
            this.showDefault();
            return;
        }

        this._showingDefault = false;
        this._refreshRevealer.reveal_child = true;
        this.currentInfo = info;
        this._cityView.info = info;

        this._stack.set_visible_child(this._cityBox);
        this._goToPage(Page.CITY);
    }

    _showAbout() {
        let designers = ['Jakub Steiner <jimmac@gmail.com>',
            'Pink Sherbet Photography (D. Sharon Pruitt)',
            'Elliott Brown',
            'Analogick',
            'DBduo Photography (Daniel R. Blume)',
            'davharuk',
            'Tech Haven Ministries',
            'Jim Pennucci'];

        let copyright = 'Copyright 2013-2015 The Weather Developers';
        let attribution = this._cityView.info ? this._cityView.info.get_attribution() : '';

        let aboutWindow = new Adw.AboutWindow(
            {
                developers: ['Giovanni Campagna <gcampagna@src.gnome.org>'],
                designers: designers,
                translator_credits: _("translator-credits"),
                application_name: _("Weather"),
                application_icon: pkg.name,
                developer_name: _("The GNOME Project"),
                copyright: copyright,
                license_type: Gtk.License.GPL_2_0,
                version: pkg.version,
                website: 'https://wiki.gnome.org/Apps/Weather',
                issue_url: 'https://gitlab.gnome.org/GNOME/gnome-weather/-/issues/new',
                transient_for: this
            });

        if (attribution.len > 0) {
            aboutWindow.add_legal_section(_("Weather"), null, Gtk.LicenseCustom, attribution);
        }

        aboutWindow.show();
    }
});
