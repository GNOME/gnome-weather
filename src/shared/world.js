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

const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const GWeather = imports.gi.GWeather;
const Lang = imports.lang;

const Params = imports.misc.params;
const Util = imports.misc.util;

function getLabelFromRow(row) {
    let grid = row.get_child();
    let cityGrid = grid.get_child_at(0, 0);
    let label = cityGrid.get_child_at(0, 0);
    return label.get_text();
}

const WorldModel = new Lang.Class({
    Name: 'WorldModel',
    Extends: GObject.Object,
    Signals: {
        'updated': { param_types: [ GWeather.Info ] },
        'no-cityview': { param_types: [] },
        'show-info': { param_types: [ GWeather.Info ] },
        'current-location-changed': { param_types: [ GWeather.Location ] },
        'validate-listbox': { param_types: [ GWeather.Location ] },
        'update-listbox': { param_types: [ GWeather.Location, GWeather.Info, GObject.Boolean ] }
    },
    Properties: {
        'loading': GObject.ParamSpec.boolean('loading', '', '', GObject.ParamFlags.READABLE, false)
    },

    _init: function(world, enableGtk) {
        this.parent();

        this._world = world;

        this._settings = Util.getSettings('org.gnome.Weather.Application');

        this._providers = Util.getEnabledProviders();

        this._loadingCount = 0;

        this._infoList = [];

        this._enableGtk = enableGtk;

        this._currentLocationInfo = null;

        this.currentlyLoadedInfo = null;

        this.addedCurrentLocation = false;

        this.numberOfLocations = 0;
    },

    currentLocationChanged: function(location) {
        if (location) {
            this._newCurrentLocationInfo = new GWeather.Info({ location: location,
                                                               enabled_providers: this._providers });
            if (this._currentLocationInfo) {
                if (!this._currentLocationInfo.location.equal(location)) {
                    this._newCurrentLocationInfo.connect('updated', Lang.bind(this, function(info) {
                        this._updateLoadingCount(-1);
                        this.emit('updated', this._newCurrentLocationInfo);
                    }));
                    this.updateInfo(this._newCurrentLocationInfo);
                    this._currentLocationInfo = this._newCurrentLocationInfo;
                }
            } else {
                this._newCurrentLocationInfo.connect('updated', Lang.bind(this, function(info) {
                    this._updateLoadingCount(-1);
                    this.emit('updated', this._newCurrentLocationInfo);
                }));
                this.updateInfo(this._newCurrentLocationInfo);
                this._currentLocationInfo = this._newCurrentLocationInfo;
            }
        }

        this.emit('current-location-changed', location);
    },

    rowActivated: function(listbox, row) {
        let cityName = getLabelFromRow(row);
        this.emit('show-info', this._infoList[cityName]);
        this.currentlyLoadedInfo = this._infoList[cityName];
        this.emit('validate-listbox', this.currentlyLoadedInfo.location);
    },

    showRecent: function(listbox) {
        let row = listbox.get_row_at_index(0);
        if (row) {
            this.rowActivated(null, row);
            return;
        } else
            this.emit('no-cityview');
    },

    _showCurrentLocation: function() {
        if (this._currentLocationInfo) {
            this.emit('show-info', this._currentLocationInfo);
            this.currentlyLoadedInfo = this._currentLocationInfo;
        }
    },

    fillListbox: function () {
        let locations = this._settings.get_value('locations').deep_unpack();
        this.numberOfLocations = locations.length;
        if (locations.length != 0) {
            for (let i = 0; i < locations.length && i < 5; i++) {
                let variant = locations[i];
                let location = this._world.deserialize(variant);
                let info = new GWeather.Info({ location: location,
                                               enabled_providers: this._providers });

                this._infoList[location.get_city_name()] = info;

                info.connect('updated', Lang.bind(this, function(info) {
                    this._updateLoadingCount(-1);
                    this.emit('updated', info);
                }));
                this.updateInfo(info);
                this.emit('update-listbox', location, info, false);
            }
        }
    },

    fillCityView: function(autoLocation) {
        let locations = this._settings.get_value('locations').deep_unpack();

        if (!autoLocation) {
            if (locations.length > 0) {
                let variant = locations[locations.length-1];
                let location = this._world.deserialize(variant);
                this.emit('show-info', this._infoList[location.get_city_name()]);
                this.currentlyLoadedInfo = this._infoList[location.get_city_name()];
                this.emit('validate-listbox', this.currentlyLoadedInfo.location);
            } else {
                this.emit('no-cityview');
            }
        }
    },

    _updateLoadingCount: function(delta) {
        let wasLoading = this._loadingCount > 0;
        this._loadingCount += delta;
        let isLoading = this._loadingCount > 0;

        if (wasLoading != isLoading)
            this.notify('loading');
    },

    updateInfo: function(info) {
        info.update();
        this._updateLoadingCount(+1);
    },

    get loading() {
        return this._loadingCount > 0;
    },

    addNewLocation: function(newLocation, isCurrentLocation) {
        if (newLocation) {
            let locations = this._settings.get_value('locations').deep_unpack();

            if (!isCurrentLocation) {
                for (let i = 0; i < locations.length; i++) {
                    let location = this._world.deserialize(locations[i]);
                    if (location.equal(newLocation)) {
                        this.emit('show-info', this._infoList[location.get_city_name()]);
                        this.currentlyLoadedInfo = this._infoList[location.get_city_name()];
                        this.emit('validate-listbox', this.currentlyLoadedInfo.location);
                        return;
                    }
                }

                locations.push(newLocation.serialize());

                this.numberOfLocations = locations.length;

                this._settings.set_value('locations', new GLib.Variant('av', locations));
            }

            let info = new GWeather.Info({ location: newLocation,
                                           enabled_providers: this._providers });

            this._infoList[newLocation.get_city_name()] = info;

            info.connect('updated', Lang.bind(this, function(info) {
                this._updateLoadingCount(-1);
                this.emit('updated', info);
            }));
            this.updateInfo(info);

            this.emit('update-listbox', newLocation, info, isCurrentLocation);
            if (!isCurrentLocation) {
                this.emit('show-info', this._infoList[newLocation.get_city_name()]);
                this.currentlyLoadedInfo = this._infoList[newLocation.get_city_name()];
                this.emit('validate-listbox', this.currentlyLoadedInfo.location);
            }
            else {
                if(!this.addedCurrentLocation) {
                    this.emit('show-info', this._currentLocationInfo);
                    this.currentlyLoadedInfo = this._currentLocationInfo;
                    this.emit('validate-listbox', this.currentlyLoadedInfo.location);
                }
                this.addedCurrentLocation = true;
            }
        }
    }
});

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

        this.initialGrid = builder.get_object('initial-grid');

        let stackPopover = builder.get_object('popover-stack');

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

        let initialGridLocEntry = builder.get_object('initial-grid-location-entry');
        initialGridLocEntry.connect('notify::location', Lang.bind(this, function(entry) {
            this._locationChanged(entry);
        }));

        let locationEntry = builder.get_object('location-entry');
        locationEntry.connect('notify::location', Lang.bind(this, function(entry) {
            this._locationChanged(entry)
        }));

        this.connect('notify::visible', Lang.bind(this, function() {
            this._listbox.set_selection_mode(0);
            locationEntry.grab_focus();
            this._listbox.set_selection_mode(1);
        }));

        let autoLocStack = builder.get_object('auto-location-stack');

        let autoLocSwitch = builder.get_object('auto-location-switch');

        let currentLocationController = application.currentLocationController;

        let handlerId = autoLocSwitch.connect('notify::active', Lang.bind(this, function() {
            currentLocationController.setAutoLocation(autoLocSwitch.get_active());

            if (autoLocSwitch.get_active() && !this.model.addedCurrentLocation)
                autoLocStack.set_visible_child_name('locating-label');

            this.hide();
        }));

        if(currentLocationController.autoLocation)
            autoLocStack.set_visible_child_name('locating-label');
        else {
            autoLocStack.set_visible_child_name('auto-location-switch-grid');
            GObject.signal_handler_block(autoLocSwitch, handlerId);
            autoLocSwitch.set_active(false);
            GObject.signal_handler_unblock(autoLocSwitch, handlerId);
        }

        this._listbox.connect('row-activated', Lang.bind(this, function(listbox, row) {
            this.hide();
            this.model.rowActivated(listbox, row);
        }));

        this.model.connect('current-location-changed', Lang.bind(this, function(model, location) {
            autoLocStack.set_visible_child_name('auto-location-switch-grid');
            if (location) {
                this.model.addNewLocation(location, true);

                GObject.signal_handler_block(autoLocSwitch, handlerId);
                autoLocSwitch.set_active(true);
                GObject.signal_handler_unblock(autoLocSwitch, handlerId);
            } else {
                if (!this.model.addedCurrentLocation)
                    this.model.showRecent(this._listbox);

                GObject.signal_handler_block(autoLocSwitch, handlerId);
                autoLocSwitch.set_active(false);
                GObject.signal_handler_unblock(autoLocSwitch, handlerId);

                autoLocSwitch.set_sensitive(false);
            }
        }));

        this.model.connect('validate-listbox', Lang.bind(this, function() {
            this._listbox.invalidate_filter();
            let children = this._listbox.get_children();
            if (children.length == 1) {
                stackPopover.set_visible_child_name("search-grid");
                return;
            }
            stackPopover.set_visible_child_name("locations-grid");
        }));

        this._listbox.set_filter_func(Lang.bind(this, this._filterListbox, this.model));

        this.model.connect('update-listbox', Lang.bind(this, this._addLocationInternal));

        this.model.fillListbox();
    },

    _filterListbox: function(row, model) {
        if(model.currentlyLoadedInfo) {
            let cityName = getLabelFromRow(row);
            let loadedCity = model.currentlyLoadedInfo.location.get_city_name();
            return (cityName != loadedCity);
        }
        return true;
    },

    _locationChanged: function(entry) {
        if (entry.location) {
            this.model.addNewLocation(entry.location, false);
            this.hide();
            entry.location = null;
        }
    },

    _addLocationInternal: function(model, location, info, isCurrentLocation) {
        let grid = new Gtk.Grid({ orientation: Gtk.Orientation.HORIZONTAL,
                                  column_spacing: 12,
                                  margin: 12 });

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

        grid.show();
        if(isCurrentLocation) {
            if (model.addedCurrentLocation) {
                let children = this._listbox.get_children();
                children[0].destroy();
            }
            this._listbox.insert(grid, 0);
        } else {
            if (model.addedCurrentLocation)
                this._listbox.insert(grid, 1);
            else
                this._listbox.insert(grid, 0);
        }
        if (model.numberOfLocations > 5) {
            let children = this._listbox.get_children();
            children[children.length-1].destroy();
        }

        info.connect('updated', Lang.bind(this, function(info) {
            tempLabel.label = info.get_temp_summary();
            image.icon_name = info.get_symbolic_icon_name();
        }));
    },
});
