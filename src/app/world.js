// -*- Mode: js; indent-tabs-mode: nil; c-basic-offset: 4; tab-width: 4 -*-
//
// Copyright (c) 2012 Giovanni Campagna <scampa.giovanni@gmail.com>
//               2014 Saurabh Patel <srp201201051@gmail.com>
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

import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import * as Util from '../misc/util.js';
import { LocationRow } from './locationRow.js';

export class WorldContentView extends Gtk.Popover {
    constructor(application, window, { align, ...params } = {}) {
        super({
            ...params,
            hexpand: false,
            halign: align,
            vexpand: false,
            hasArrow: false,
        });

        this.add_css_class('weather-popover');
        this.add_css_class('menu');

        this.update_property([Gtk.AccessibleProperty.LABEL], [_("World view")]);
        let builder = new Gtk.Builder();
        builder.add_from_resource('/org/gnome/Weather/places-popover.ui');

        const box = builder.get_object('popoverBox');
        this.set_child(box);

        this._searchListView = builder.get_object('search-list-view');
        this._searchListScrollWindow = builder.get_object('search-list-scroll-window');

        this.model = application.model;
        this._window = window;

        this._listboxScrollWindow = builder.get_object('locations-list-scroll-window');
        this._listbox = builder.get_object('locations-list-box');
        this._listbox.bind_model(this.model, (info) => {
            return this._buildLocation(this.model, info);
        });

        this._locationEntry = builder.get_object('location-entry');

        this._locationEntry.setListView(this._searchListView);
        this._locationEntry.connect('search-updated', (entry, text) => {
            if (!text) {
                this._stackPopover.set_visible_child(this._listboxScrollWindow);
                entry.text = '';
                return;
            }

            this._stackPopover.set_visible_child(this._searchListScrollWindow);
        });
        this._locationEntry.connect('notify::location', (entry) => {
            const location = entry.location;
            entry.text = '';

            this._locationChanged(location);

            this._stackPopover.set_visible_child(this._listboxScrollWindow);

            // Defer the popdown to allow the stack to re-render
            imports.mainloop.idle_add(() => {
                this.popdown();
                return false;
            });
        });

        this.connect('show', () => {
            this._locationEntry.grab_focus();
        });

        this._currentLocationController = application.currentLocationController;

        this._listbox.connect('row-activated', (listbox, row) => {
            if (row._info)
                this.model.setSelectedLocation(row._info);

            // Defer the popdown to allow the stack to re-render
            imports.mainloop.idle_add(() => {
                this.popdown();
                return false;
            });
        });

        this.model.connect('selected-location-changed', (_, info) => {
            this._window.showInfo(info);
        });

        this._stackPopover = builder.get_object('popover-stack');
        this._stackPopover.set_visible_child(this._listboxScrollWindow);

        this._currentLocationAdded = false;

    }

    vfunc_unroot() {
        this._listbox.bind_model(null, null);

        this._window = null;

        super.vfunc_unroot();
    }

    refilter() {
        this._listbox.invalidate_filter();
    }

    _locationChanged(location) {
        if (location) {
            let info = this.model.addNewLocation(location);
            this._window.showInfo(info);
        }
    }

    _buildLocation(model, info) {
        if (!info) return new LocationRow({ name: '', countryName: '' });;

        let location = info.location;

        const [name, countryName = ''] = Util.getNameAndCountry(location);

        const isSelected = model.isSelectedLocation(info);
        const isCurrentLocation = model.isCurrentLocation(info);
        const grid = new LocationRow({
            name,
            countryName,
            isSelected,
            isCurrentLocation,
            isRemovable: !isSelected && !isCurrentLocation,
        });

        grid.connect('remove', () => {
            model.removeLocation(info);
        });

        const row = new Gtk.ListBoxRow({ child: grid });
        row._info = info;
        return row;
    }
};

GObject.registerClass(WorldContentView);
