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
    _label!: Gtk.Label;
    _countryLabel!: Gtk.Label;
    _locationIcon!: Gtk.Image;
    _currentIcon!: Gtk.Image;
    _removeButton!: Gtk.Button;

    constructor({ name, countryName, isSelected = false, isCurrentLocation = false, isRemovable = false }: { name: string; countryName: string; isSelected?: boolean; isCurrentLocation?: boolean; isRemovable?: boolean; }) {
        super({ widthRequest: 320 });

        this.name = name;
        this.countryName = countryName;
        this.isSelected = isSelected;
        this.isCurrentLocation = isCurrentLocation;
        this.isRemovable = isRemovable;
    }

    set name(name: string) {
        this._label.label = name;
    }

    set countryName(name: string) {
        this._countryLabel.label = name;
    }

    set isCurrentLocation(is: boolean) {
        this._locationIcon.visible = is;
    }

    set isSelected(is: boolean) {
        this._currentIcon.visible = is;
    }

    set isRemovable(is: boolean) {
        this._removeButton.visible = is;
    }

    _onRemoveClicked() {
        this.emit('remove');
    }
});

