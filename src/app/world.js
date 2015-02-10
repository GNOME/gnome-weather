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

const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const GWeather = imports.gi.GWeather;
const Lang = imports.lang;

const Params = imports.misc.params;
const Util = imports.misc.util;


const WorldContentView = new Lang.Class({
    Name: 'WorldContentView',
    Extends: Gtk.Popover,

    _init: function(application, params) {
        params = Params.fill(params, { hexpand: false, vexpand: false });
        this.parent(params);

        this.get_accessible().accessible_name = _("World view");

        let builder = new Gtk.Builder();
        builder.add_from_resource('/org/gnome/Weather/Application/places-popover.ui');

        let grid = builder.get_object('popover-grid');
        this.add(grid);

        this.model = application.model;

        this._listbox = builder.get_object('locations-list-box');
        this._listbox.set_header_func(function (row, previous) {
            let hasHeader = row.get_header() != null;
            let shouldHaveHeader = previous != null;
            if (hasHeader != shouldHaveHeader) {
                if (shouldHaveHeader)
                    row.set_header(new Gtk.Separator());
                else
                    row.set_header(null);
            }
        });

        let locationEntry = builder.get_object('location-entry');
        locationEntry.connect('notify::location', Lang.bind(this, this._locationChanged));

        this.connect('show', Lang.bind(this, function() {
            locationEntry.grab_focus();
        }));

        let autoLocStack = builder.get_object('auto-location-stack');
        let autoLocSwitch = builder.get_object('auto-location-switch');
        let currentLocationController = application.currentLocationController;

        if(currentLocationController.autoLocation) {
            autoLocStack.visible_child_name = 'locating-label';
        } else {
            autoLocStack.visible_child_name = 'auto-location-switch-grid';
            autoLocSwitch.active = false;
        }

        let handlerId = autoLocSwitch.connect('notify::active', Lang.bind(this, function() {
            currentLocationController.setAutoLocation(autoLocSwitch.active);

            if (autoLocSwitch.active && !this.model.addedCurrentLocation)
                autoLocStack.visible_child_name = 'locating-label';

            this.hide();
        }));

        this._listbox.connect('row-activated', Lang.bind(this, function(listbox, row) {
            this.hide();
            this.model.showInfo(row._info, row._isCurrentLocation);
        }));

        this.model.connect('current-location-changed', Lang.bind(this, function(model, location) {
            autoLocStack.visible_child_name = 'auto-location-switch-grid';
            if (location) {
                GObject.signal_handler_block(autoLocSwitch, handlerId);
                autoLocSwitch.active = true;
                GObject.signal_handler_unblock(autoLocSwitch, handlerId);
            } else {
                GObject.signal_handler_block(autoLocSwitch, handlerId);
                autoLocSwitch.active = false;
                GObject.signal_handler_unblock(autoLocSwitch, handlerId);

                autoLocSwitch.sensitive = false;
            }
        }));

        let stackPopover = builder.get_object('popover-stack');
        this.model.connect('revalidate', Lang.bind(this, function() {
            this._listbox.invalidate_filter();

            let children = this._listbox.get_children();
            if (children.length == 1)
                stackPopover.set_visible_child_name("search-grid");
            else
                stackPopover.set_visible_child_name("locations-grid");
        }));

        this._listbox.set_filter_func(Lang.bind(this, this._filterListbox, this.model));
        this.model.connect('location-added', Lang.bind(this, this._onLocationAdded));
        this.model.connect('location-removed', Lang.bind(this, this._onLocationRemoved));

        this.model.load();
    },

    _filterListbox: function(row, model) {
        return model.currentlyLoadedInfo == null ||
            row._info != model.currentlyLoadedInfo;
    },

    _locationChanged: function(entry) {
        if (entry.location) {
            this.model.addNewLocation(entry.location, false);
            this.hide();
            entry.location = null;
        }
    },

    _onLocationAdded: function(model, info, isCurrentLocation) {
        let location = info.location;

        let grid = new Gtk.Grid({ orientation: Gtk.Orientation.HORIZONTAL,
                                  column_spacing: 12,
                                  margin: 12,
                                  visible: true });

        let name = location.get_city_name();
        let locationGrid = new Gtk.Grid({ orientation: Gtk.Orientation.HORIZONTAL,
                                          column_spacing: 12,
                                          halign: Gtk.Align.START,
                                          hexpand: true,
                                          visible: true });
        let locationLabel = new Gtk.Label({ label: name,
                                            use_markup: true,
                                            halign: Gtk.Align.START,
                                            visible: true });
        locationGrid.attach(locationLabel, 0, 0, 1, 1);
        grid.attach(locationGrid, 0, 0, 1, 1);

        let tempLabel = new Gtk.Label({ use_markup: true,
                                        halign: Gtk.Align.END,
                                        margin_start: 12,
                                        visible: true });
        grid.attach(tempLabel, 1, 0, 1, 1);

        if (isCurrentLocation) {
            let image = new Gtk.Image({ icon_size: Gtk.IconSize.LARGE_TOOLBAR,
                                        icon_name: 'mark-location-symbolic',
                                        use_fallback: true,
                                        halign: Gtk.Align.START,
                                        visible: true });
            locationGrid.attach(image, 1, 0, 1, 1);
        }

        let image = new Gtk.Image({ icon_size: Gtk.IconSize.LARGE_TOOLBAR,
                                    use_fallback: true,
                                    halign: Gtk.Align.END,
                                    visible: true });
        grid.attach(image, 2, 0, 1, 1);

        let row = new Gtk.ListBoxRow({ visible: true });
        row.add(grid);
        row._info = info;
        row._isCurrentLocation = isCurrentLocation;

        if (isCurrentLocation) {
            if (model.addedCurrentLocation) {
                this._listbox.get_row_at_index(0).destroy();
            }

            this._listbox.insert(row, 0);
        } else {
            if (model.addedCurrentLocation)
                this._listbox.insert(row, 1);
            else
                this._listbox.insert(row, 0);
        }

        if (info._updatedId)
            return;

        info._updatedId = info.connect('updated', Lang.bind(this, function(info) {
            tempLabel.label = info.get_temp_summary();
            image.icon_name = info.get_symbolic_icon_name();
        }));
    },

    _onLocationRemoved: function(model, info) {
        let rows = this._listbox.get_children();

        for (let row of rows) {
            if (row._info == info) {
                row.destroy();
                break;
            }
        }

        if (info._updatedId) {
            info.disconnect(info._updatedId);
            info._updatedId = 0;
        }
    },
});
