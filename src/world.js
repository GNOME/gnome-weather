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

const Util = imports.util;

const Columns = {
    ID: Gd.MainColumns.ID,
    URI: Gd.MainColumns.URI,
    PRIMARY_TEXT: Gd.MainColumns.PRIMARY_TEXT,
    SECONDARY_TEXT: Gd.MainColumns.SECONDARY_TEXT,
    ICON: Gd.MainColumns.ICON,
    MTIME: Gd.MainColumns.MTIME,
    SELECTED: Gd.MainColumns.SELECTED,
    LOCATION: 7,
    INFO: 8
};

const ICON_SIZE = 128;

const WorldModel = new Lang.Class({
    Name: 'WorldModel',

    _init: function(world) {
        this._world = world;

        this._settings = Util.getSettings('org.gnome.Weather.Application');

        this._locations = [];
        let locations = this._settings.get_value('locations').deep_unpack();
        for (let i = 0; i < locations.length; i++) {
            let variant = locations[i];
            let location = this._world.deserialize(variant);
            this._addLocationInternal(location);
        }

        this._settings.connect('changed::locations', Lang.bind(this, this._onChanged));
    },

    get locations() {
        return this._locations;
    },

    _addLocationInternal: function(location, index) {
        let info = new GWeather.Info({ location: location,
                                       forecast_type: GWeather.ForecastType.LIST,
                                       enabled_providers: (GWeather.Provider.METAR |
                                                           GWeather.Provider.YR_NO) });

        let obj = { weather_info: info,
                    location: location };

        if (index == undefined)
            this._locations.push(obj);
        else
            this._locations[index] = obj;

        this.emit('location-added', obj, index);
    },

    _onChanged: function() {
        let newLocations = this._settings.get_value('locations').deep_unpack();
        let newObjects = [];
        let toErase = [];

        for (let i = 0; i < this._locations.length; i++) {
            let obj = this._locations[i];
            let location = obj.location;

            let found = false;
            for (let j = 0; j < newLocations.length; j++) {
                let variant = newLocations[j];
                if (variant == null)
                    continue;

                let newLocation = this._world.deserialize(variant);

                if (location.equal(newLocation)) {
                    newLocations[j] = null;
                    newObjects[j] = obj;
                    found = true;
                    break;
                }
            }

            if (!found)
                this.emit('location-removed', obj);
        }

        this._locations = newObjects;

        for (let i = 0; i < newLocations.length; i++) {
            let variant = newLocations[i];
            if (variant == null)
                continue;

            let newLocation = this._world.deserialize(variant);
            this._addLocationInternal(newLocation, i);
        }
    },

    addLocation: function(location) {
        let newLocations = this._settings.get_value('locations').deep_unpack();
        newLocations.push(location.serialize());
        this._settings.set_value('locations', new GLib.Variant('av', newLocations));
    },

    removeLocation: function(location) {
        let variant = location.serialize();

        let newLocations = this._settings.get_value('locations').deep_unpack();
        for (let i = 0; i < newLocations.length; i++) {
            if (newLocations[i].equal(variant)) {
                newLocations.splice(i, 1);
                break;
            }
        }
        this._settings.set_value('locations', new GLib.Variant('av', newLocations));
    },
});
Signals.addSignalMethods(WorldModel.prototype);

const WorldItem = new Lang.Class({
    Name: 'WorldItem',
    Extends: Gtk.EventBox,

    Properties: { 'is-selecting': GObject.ParamSpec.boolean('is-selecting', '', '',
                                                            GObject.ParamFlags.READABLE |
                                                            GObject.ParamFlags.WRITABLE, false) },
    Signals: { 'selection-request': { } },

    _init: function(params) {
        let filtered = Params.filter(params, { weather_info: null });
        this.parent(params);

        this.add_events(Gdk.EventMask.BUTTON_PRESS_MASK);

        let overlay = new Gtk.Overlay();
        let grid = new Gtk.Grid({ orientation: Gtk.Orientation.VERTICAL });

        this.info = filtered.weather_info;
        this._updatedId = this.info.connect('updated', Lang.bind(this, this._updated));

        this._stack = new Gtk.Stack();
        this._spinner = new Gtk.Spinner();
        this._stack.add(this._spinner);
        this._image = new Gtk.Image({ icon_name: 'view-refresh-symbolic',
                                      use_fallback: true,
                                      pixel_size: ICON_SIZE });
        this._stack.add(this._image);
        grid.add(this._stack);

        this._label = new Gtk.Label({ label: this.info.get_location().get_city_name() });
        grid.add(this._label);

        this._sublabel = new Gtk.Label();
        this._sublabel.get_style_context().add_class('dim-label');
        grid.add(this._sublabel);

        this._toggle = new Gtk.CheckButton({ halign: Gtk.Align.END,
                                             valign: Gtk.Align.END });
        overlay.add_overlay(this._toggle);

        overlay.add(grid);
        this.add(overlay);
        this.show_all();

        // Can't use vfunc_button_release_event because the signal has GdkEvent
        // but the vfunc has GdkEventKey
        this.connect('button-release-event', function(widget, event) {
            let [ok, button] = event.get_button();

            if (ok && button == 3) {
                widget.emit('selection-request');
                return true;
            }

            return false;
        });

        if (this.info.is_valid()) {
            this._stack.visible_child = this._image;
        } else {
            this._stack.visible_child = this._spinner;
            this._spinner.start();
        }
    },

    get is_selecting() {
        if (!this._toggle)
            return false;

        return this._toggle.visible;
    },

    set is_selecting(v) {
        if (!this._toggle)
            return;

        this._toggle.visible = v;
        this.notify('is-selecting');
    },

    vfunc_destroy: function() {
        if (this._updatedId) {
            this.info.disconnect(this._updatedId);
            this._updatedId = 0;
        }

        this.parent();
    },

    _updated: function() {
        this._spinner.stop();
        this._stack.visible_child = this._image;

        this._image.icon_name = this.info.get_symbolic_icon_name();
        this._sublabel.label = Util.getWeatherConditions(this.info, true);
    },
});

const WorldIconView = new Lang.Class({
    Name: 'WorldView',
    Extends: Egg.FlowBox,
    Properties: { 'empty': GObject.ParamSpec.boolean('empty', '', '', GObject.ParamFlags.READABLE, false),
                  // Can't use "selection-mode", already used for something entirely different
                  'is-selecting': GObject.ParamSpec.boolean('is-selecting', '', '',
                                                            GObject.ParamFlags.READABLE |
                                                            GObject.ParamFlags.WRITABLE, false) },

    _init: function(params) {
        let filtered = Params.filter(params, { model: null });
        params = Params.fill(params, { activate_on_single_click: true,
                                       selection_mode: Gtk.SelectionMode.MULTIPLE,
                                       margin_top: 6,
                                       margin_bottom: 6,
                                       margin_left: 6,
                                       margin_right: 6,
                                       homogeneous: true,
                                       vertical_spacing: 12,
                                       horizontal_spacing: 12 });
        this.parent(params);

        let model = filtered.model;
        this.model = filtered.model;

        this._locationAddedId = model.connect('location-added', Lang.bind(this, this._locationAdded));
        this._locationRemovedId = model.connect('location-removed', Lang.bind(this, this._locationRemoved));

        this._nChildren = 0;

        let locations = this.model.locations;
        for (let i = 0; i < locations.length; i++)
            this._locationAdded(this.model, locations[i], i);

        this._selectionMode = false;
        this.unselect_all();
    },

    vfunc_destroy: function() {
        if (this._locationAddedId) {
            this.model.disconnect(this._locationAddedId);
            this._locationAddedId = 0;
        }
        if (this._locationRemovedId) {
            this.model.disconnect(this._locationRemovedId);
            this._locationRemovedId = 0;
        }

        this.parent();
    },

    vfunc_selected_children_changed: function() {
        let selected = this.get_selected_children();

        if (selected.length > 0)
            this.is_selecting = true;

        this.parent();
    },

    get is_selecting() {
        return this._selectionMode;
    },

    set is_selecting(v) {
        if (v == this._selectionMode)
            return;

        this._selectionMode = v;
        if (!v)
            this.unselect_all();

        let children = this.get_children();
        for (let i = 0; i < children.length; i++)
            children.is_selecting = v;

        this.notify('is-selecting');
    },

    get empty() {
        return this._nChildren == 0;
    },

    _locationAdded: function(model, obj, index) {
        let item = new WorldItem({ weather_info: obj.weather_info });
        obj._item = item;

        item.connect('selection-request', Lang.bind(this, function(item) {
            if (this.is_child_selected(item))
                this.unselect_child(item);
            else
                this.select_child(item);
        }));

        // FIXME: child-set the index
        this.add(item);
        this._nChildren++;

        if (this._nChildren == 1)
            this.notify('empty');
    },

    _locationRemoved: function(model, obj) {
        if (obj._item) {
            obj._item.destroy();
            this._nChildren--;

            if (this._nChildren == 0)
                this.notify('empty');
        }

        obj._item = null;
    },

    _updateEmpty: function() {
        let [ok, iter] = this.model.get_iter_first();

        if (!ok != this._empty) {
            if (ok) {
            }

            this._empty = !ok;
            this.notify('empty');
        }
    }
});

const WorldContentView = new Lang.Class({
    Name: 'WorldContentView',
    Extends: Gtk.Frame,
    Properties: { 'empty': GObject.ParamSpec.boolean('empty', '', '', GObject.ParamFlags.READABLE, false) },

    _init: function(model, params) {
        params = Params.fill(params, { hexpand: true, vexpand: true,
                                       halign: Gtk.Align.FILL, valign: Gtk.Align.FILL });
        this.parent(params);

        this.get_style_context().add_class('view');
        this.get_style_context().add_class('content-view');

        this.iconView = new WorldIconView({ model: model, visible: true });

        this._placeHolder = new Gtk.Grid({ halign: Gtk.Align.CENTER,
                                           valign: Gtk.Align.CENTER,
                                           name: 'weather-page-placeholder',
                                           column_spacing: 6 });
        this._placeHolder.get_style_context().add_class('dim-label');

        let iconGrid = new Gtk.Grid({ row_spacing: 4, column_spacing: 4 });
        iconGrid.attach(new Gtk.Image({ icon_name: 'weather-overcast-symbolic',
                                        icon_size: Gtk.IconSize.LARGE_TOOLBAR }),
                        0, 0, 1, 1);
        iconGrid.attach(new Gtk.Image({ icon_name: 'weather-few-clouds-symbolic',
                                        icon_size: Gtk.IconSize.LARGE_TOOLBAR }),
                        1, 0, 1, 1);
        iconGrid.attach(new Gtk.Image({ icon_name: 'weather-clear-symbolic',
                                        icon_size: Gtk.IconSize.LARGE_TOOLBAR }),
                        0, 1, 1, 1);
        iconGrid.attach(new Gtk.Image({ icon_name: 'weather-showers-symbolic',
                                        icon_size: Gtk.IconSize.LARGE_TOOLBAR }),
                        1, 1, 1, 1);

        this._placeHolder.attach(iconGrid, 0, 0, 1, 2);

        this._placeHolder.attach(new Gtk.Label({ name: 'weather-page-placeholder-title',
                                                 label: _("Add locations"),
                                                 xalign: 0.0 }),
                                 1, 0, 1, 1);
        this._placeHolder.attach(new Gtk.Label({ label: _("Use the <b>New</b> button on the toolbar to add more world locations"),
                                                 use_markup: true,
                                                 max_width_chars: 30,
                                                 wrap: true,
                                                 halign: Gtk.Align.START,
                                                 valign: Gtk.Align.START }),
                                 1, 1, 1, 1);
        this._placeHolder.show_all();

        this.iconView.connect('notify::empty', Lang.bind(this, this._updateEmpty));
        this._updateEmpty();
    },

    _updateEmpty: function() {
        if (this.iconView.empty)
            this.add(this._placeHolder);
        else
            this.add(this.iconView);
    },
});
