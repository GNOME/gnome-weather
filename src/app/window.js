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
import GWeather from 'gi://GWeather';

import * as City from './city.js';
import * as Util from '../misc/util.js';
import { WorldContentView } from './world.js';
import { WeatherApplication } from './application.js';

const Page = {
    SEARCH: 0,
    CITY: 1
};

export class MainWindow extends Adw.ApplicationWindow {
    /** @type {Adw.ToolbarView} */
    // @ts-ignore
    _searchView = this._searchView;
    /** @type {Adw.StatusPage} */
    // @ts-ignore
    _searchViewStatus = this._searchViewStatus;
    /** @type {Gtk.MenuButton} */
    // @ts-ignore
    _searchButton = this._searchButton;
    /** @type {Gtk.Button} */
    // @ts-ignore
    _refresh = this._refresh;
    /** @type {Gtk.Revealer} */
    // @ts-ignore
    _refreshRevealer = this._refreshRevealer;
    /** @type {Adw.ViewSwitcherTitle} */
    // @ts-ignore
    _forecastStackSwitcher = this._forecastStackSwitcher;
    /** @type {Adw.ViewSwitcherBar} */
    // @ts-ignore
    _forecastStackSwitcherBar = this._forecastStackSwitcherBar;
    /** @type {Adw.Bin} */
    // @ts-ignore
    _cityBin = this._cityBin;
    /** @type {Adw.ToolbarView} */
    // @ts-ignore
    _cityBox = this._cityBox;
    /** @type {Gtk.Stack} */
    // @ts-ignore
    _stack = this._stack;

    static {
        GObject.registerClass({
            Template: 'resource:///org/gnome/Weather/window.ui',
            InternalChildren: ['header', 'refreshRevealer', 'refresh', 'forecastStackSwitcher', 'stack',
                'searchButton', 'searchView', 'searchViewStatus', 'forecastStackSwitcherBar', 'cityBox', 'cityBin']
        }, this)
    }

    /**
     * @param {Partial<Adw.ApplicationWindow.ConstructorProps> | undefined} params
     */
    constructor(params) {
        super(params);

        const app = (/** @type {WeatherApplication} */ (this.application));

        this._world = app.world;
        this.currentInfo = null;
        this._currentPage = Page.SEARCH;

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

        this._model = app.model;

        this._searchViewStatus.icon_name = pkg.name ?? '';

        this._worldView = new WorldContentView(app, this, {
            align: Gtk.Align.CENTER,
        });
        this._searchButton.set_popover(this._worldView);

        this._cityView = new City.WeatherView(app, this,
            { hexpand: true, vexpand: true });

        this._cityBin.set_child(this._cityView);

        this._forecastStackSwitcher.stack = this._cityView.getForecastStack();
        this._forecastStackSwitcherBar.stack = this._cityView.getForecastStack();

        this._stack.set_visible_child(this._searchView);

        // @ts-expect-error ts-for-gir once again treats pkg oddly
        if (pkg.name.endsWith('Devel')) {
            let ctx = this.get_style_context();
            ctx.add_class('devel');
        }

        this._showingDefault = false;

        this._settings = Util.getSettings('org.gnome.Weather');
        this._restoreWindowGeometry();
        this.connect('close-request', () => this._saveWindowGeometry());
    }

    update() {
        this._cityView.update();
    }

    _saveWindowGeometry() {
        this._settings.set_boolean(
            'window-maximized',
            this.maximized
        );

        let defaultWindowSize = this.get_default_size()
        this._settings.set_int(
            'window-width', defaultWindowSize[0]
        );
        this._settings.set_int(
            'window-height', defaultWindowSize[1]
        );
    }

    _restoreWindowGeometry() {
        if (this._settings.get_boolean('window-maximized')) {
            this.maximize()
        }

        let width = this._settings.get_int('window-width');
        let height = this._settings.get_int('window-height');
        this.set_default_size(width, height);
    }

    showDefault() {
        this._showingDefault = true;
        this._refreshRevealer.reveal_child = false;

        let mostRecent = this._model?.getRecent();
        if (mostRecent)
            this.showInfo(mostRecent);
        else
            this.showSearch();
    }

    /**
     * @param {string | undefined} _text
     */
    showSearch(_text = undefined) {
        this._showingDefault = false;
        this._refreshRevealer.reveal_child = true;
        this._stack.set_visible_child(this._searchView);
    }

    /**
     * @param {GWeather.Info | undefined} info
     */
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
        let attribution = this._cityView.info?.get_attribution();

        let aboutDialog = new Adw.AboutDialog(
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
                website: 'https://apps.gnome.org/Weather/',
                issue_url: 'https://gitlab.gnome.org/GNOME/gnome-weather/-/issues/',
            });

        if (attribution) {
            aboutDialog.add_legal_section(_("Weather"), null, Gtk.License.CUSTOM, attribution);
        }

        aboutDialog.present(this);
    }
};
