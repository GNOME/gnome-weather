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
import {WorldContentView} from './world.js';
import {WeatherApplication} from './application.js';
import {WorldModel} from '../shared/world.js';

export class MainWindow extends Adw.ApplicationWindow {
    declare private _searchView: Adw.ToolbarView;
    declare private _searchViewStatus: Adw.StatusPage;
    declare private _searchButton: Gtk.MenuButton;
    declare private _refreshRevealer: Gtk.Revealer;
    declare private _forecastStackSwitcher: Adw.ViewSwitcherTitle;
    declare private _forecastStackSwitcherBar: Adw.ViewSwitcherBar;
    declare private _cityBin: Adw.Bin;
    declare private _cityBox: Adw.ToolbarView;
    declare private _stack: Gtk.Stack;

    private model: WorldModel;
    private worldView: WorldContentView;
    private cityView: City.WeatherView;
    private settings: Gio.Settings;

    static {
        GObject.registerClass(
            {
                Template: 'resource:///org/gnome/Weather/window.ui',
                InternalChildren: [
                    'header',
                    'refreshRevealer',
                    'refresh',
                    'forecastStackSwitcher',
                    'stack',
                    'searchButton',
                    'searchView',
                    'searchViewStatus',
                    'forecastStackSwitcherBar',
                    'cityBox',
                    'cityBin',
                ],
            },
            this
        );
    }

    public constructor(
        params: Partial<Adw.ApplicationWindow.ConstructorProps> | undefined
    ) {
        super(params);

        const app = this.application as WeatherApplication;

        const aboutAction = new Gio.SimpleAction({
            enabled: true,
            name: 'about',
        });
        aboutAction.connect('activate', () => this.showAbout());
        this.add_action(aboutAction);

        const refreshAction = new Gio.SimpleAction({
            enabled: true,
            name: 'refresh',
        });
        refreshAction.connect('activate', () => this.update());
        this.add_action(refreshAction);

        this.model = app.model;

        this._searchViewStatus.icon_name = pkg.name ?? '';

        this.worldView = new WorldContentView(app, this, {
            align: Gtk.Align.CENTER,
        });
        this._searchButton.set_popover(this.worldView);

        this.cityView = new City.WeatherView(app, this, {
            hexpand: true,
            vexpand: true,
        });

        this._cityBin.set_child(this.cityView);

        this._forecastStackSwitcher.stack = this.cityView.getForecastStack();
        this._forecastStackSwitcherBar.stack = this.cityView.getForecastStack();

        this._stack.set_visible_child(this._searchView);

        if (pkg.name?.endsWith('Devel')) {
            const ctx = this.get_style_context();
            ctx.add_class('devel');
        }

        this.settings = Util.getSettings('org.gnome.Weather');
        this.restoreWindowGeometry();
        this.connect('close-request', () => this.saveWindowGeometry());
    }

    public update(): void {
        this.cityView.update();
    }

    private saveWindowGeometry(): void {
        this.settings.set_boolean('window-maximized', this.maximized);

        const defaultWindowSize = this.get_default_size();
        this.settings.set_int('window-width', defaultWindowSize[0]);
        this.settings.set_int('window-height', defaultWindowSize[1]);
    }

    private restoreWindowGeometry(): void {
        if (this.settings.get_boolean('window-maximized')) {
            this.maximize();
        }

        const width = this.settings.get_int('window-width');
        const height = this.settings.get_int('window-height');
        this.set_default_size(width, height);
    }

    public showDefault(): void {
        this._refreshRevealer.reveal_child = false;

        const mostRecent = this.model.getRecent();
        if (mostRecent) this.showInfo(mostRecent);
        else this.showSearch();
    }

    public showSearch(_text?: string): void {
        this._refreshRevealer.reveal_child = true;
        this._stack.set_visible_child(this._searchView);
    }

    public showInfo(info?: GWeather.Info): void {
        if (!info) {
            this.showDefault();
            return;
        }

        this._refreshRevealer.reveal_child = true;
        this.cityView.info = info;

        this._stack.set_visible_child(this._cityBox);
    }

    private showAbout(): void {
        const designers = [
            'Jakub Steiner <jimmac@gmail.com>',
            'Pink Sherbet Photography (D. Sharon Pruitt)',
            'Elliott Brown',
            'Analogick',
            'DBduo Photography (Daniel R. Blume)',
            'davharuk',
            'Tech Haven Ministries',
            'Jim Pennucci',
        ];

        const copyright = 'Copyright 2013-2015 The Weather Developers';
        const attribution = this.cityView.info?.get_attribution();

        const aboutDialog = new Adw.AboutDialog({
            developers: ['Giovanni Campagna <gcampagna@src.gnome.org>'],
            designers: designers,
            translator_credits: _('translator-credits'),
            application_name: _('Weather'),
            application_icon: pkg.name,
            developer_name: _('The GNOME Project'),
            copyright: copyright,
            license_type: Gtk.License.GPL_2_0,
            version: pkg.version,
            website: 'https://apps.gnome.org/Weather/',
            issue_url: 'https://gitlab.gnome.org/GNOME/gnome-weather/-/issues/',
        });

        if (attribution) {
            aboutDialog.add_legal_section(
                _('Weather'),
                null,
                Gtk.License.CUSTOM,
                attribution
            );
        }

        aboutDialog.present(this);
    }
}
