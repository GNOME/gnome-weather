import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import GLib from 'gi://GLib';

export const LocationRow = GObject.registerClass({
    CssName: 'WeatherLocationRow',
    Template: GLib.Uri.resolve_relative(import.meta.url, './locationRow.ui', 0),
    InternalChildren: ['label', 'countryLabel', 'labelContainer', 'locationIcon', 'currentIcon'],
}, class LocationRow extends Gtk.Widget {
    constructor({ name, countryName, isSelected = false, isCurrentLocation = false }) {
        super({ widthRequest: 320 });

        Object.assign(this.layoutManager, {
            orientation: Gtk.Orientation.HORIZONTAL,
        });

        this.name = name;
        this.countryName = countryName ?? '';
        this.isSelected = isSelected;
        this.isCurrentLocation = isCurrentLocation;
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

    vfunc_unroot() {
        this._labelContainer.unparent();
        this._currentIcon.unparent();
        this._locationIcon.unparent();

        super.vfunc_unroot();
    }
});

LocationRow.set_layout_manager_type(Gtk.BoxLayout);
