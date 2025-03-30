import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import GLib from 'gi://GLib';

export class LocationRow extends Gtk.Box {
    declare private _label: Gtk.Label;
    declare private _countryLabel: Gtk.Label;
    declare private _locationIcon: Gtk.Image;
    declare private _currentIcon: Gtk.Image;
    declare private _removeButton: Gtk.Button;

    static {
        GObject.registerClass(
            {
                Template: GLib.Uri.resolve_relative(
                    import.meta.url,
                    './locationRow.ui',
                    0
                ),
                InternalChildren: [
                    'label',
                    'countryLabel',
                    'locationIcon',
                    'currentIcon',
                    'removeButton',
                ],
                Signals: {
                    remove: {},
                },
            },
            this
        );
    }

    public constructor({
        name,
        countryName,
        isSelected = false,
        isCurrentLocation = false,
        isRemovable = false,
    }: {
        name: string;
        countryName: string;
        isSelected?: boolean;
        isCurrentLocation?: boolean;
        isRemovable?: boolean;
    }) {
        super({widthRequest: 320});

        this.name = name;
        this.countryName = countryName;
        this.isSelected = isSelected;
        this.isCurrentLocation = isCurrentLocation;
        this.isRemovable = isRemovable;
    }

    public set name(name: string) {
        this._label.label = name;
    }

    public set countryName(name: string) {
        this._countryLabel.label = name;
    }

    public set isCurrentLocation(is: boolean) {
        this._locationIcon.visible = is;
    }

    public set isSelected(is: boolean) {
        this._currentIcon.visible = is;
    }

    public set isRemovable(is: boolean) {
        this._removeButton.visible = is;
    }

    public _onRemoveClicked(): void {
        this.emit('remove');
    }
}
