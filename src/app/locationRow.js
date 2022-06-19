import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import GLib from 'gi://GLib';

export const LocationRow = GObject.registerClass({
    Template: GLib.Uri.resolve_relative(import.meta.url, './locationRow.ui', 0),
    InternalChildren: ['label', 'countryLabel', 'locationIcon', 'currentIcon', 'removeButton'],
    Signals: {
        'remove': {},
    }
}, class LocationRow extends Gtk.Box {
    constructor({ name, countryName, isSelected = false, isCurrentLocation = false, isRemovable = false }) {
        super({ widthRequest: 320 });

        this.name = name;
        this.countryName = countryName ?? '';
        this.isSelected = isSelected;
        this.isCurrentLocation = isCurrentLocation;
        this.isRemovable = isRemovable;
    }

    set name(name) {
        this._label.label = name;
    }

    set countryName(name) {
        this._countryLabel.label = name;
    }

    set isCurrentLocation(is) {
        this._locationIcon.visible = is;
    }

    set isSelected(is) {
        this._currentIcon.visible = is;
    }

    set isRemovable(is) {
        this._removeButton.visible = is;
    }

    _onRemoveClicked() {
        this.emit('remove');
    }
});

