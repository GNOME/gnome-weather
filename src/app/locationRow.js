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
    /** @type {Gtk.Label} */
    // @ts-ignore
    _label = this._label;
    /** @type {Gtk.Label} */
    // @ts-ignore
    _countryLabel = this._countryLabel;
    /** @type {Gtk.Image} */
    // @ts-ignore
    _locationIcon = this._locationIcon;
    /** @type {Gtk.Image} */
    // @ts-ignore
    _currentIcon = this._currentIcon;
    /** @type {Gtk.Button} */
    // @ts-ignore
    _removeButton = this._removeButton;

    /** @param {Object} param0
    * @param {string} param0.name
    * @param {string} param0.countryName
    * @param {boolean} [param0.isSelected=false] 
    * @param {boolean} [param0.isCurrentLocation=false] 
    * @param {boolean} [param0.isRemovable=false]  */
    constructor({ name, countryName, isSelected = false, isCurrentLocation = false, isRemovable = false }) {
        super({ widthRequest: 320 });

        this.name = name;
        this.countryName = countryName;
        this.isSelected = isSelected;
        this.isCurrentLocation = isCurrentLocation;
        this.isRemovable = isRemovable;
    }

    /**
     * @param {string} name
     */
    set name(name) {
        this._label.label = name;
    }

    /**
     * @param {string} name
     */
    set countryName(name) {
        this._countryLabel.label = name;
    }

    /**
     * @param {boolean} is
     */
    set isCurrentLocation(is) {
        this._locationIcon.visible = is;
    }

    /**
     * @param {boolean} is
     */
    set isSelected(is) {
        this._currentIcon.visible = is;
    }

    /**
     * @param {boolean} is
     */
    set isRemovable(is) {
        this._removeButton.visible = is;
    }

    _onRemoveClicked() {
        this.emit('remove');
    }
});

