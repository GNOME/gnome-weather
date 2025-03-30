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

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

const ShellIntegrationInterface = new TextDecoder().decode(
    Gio.resources_lookup_data(
        '/org/gnome/shell/ShellWeatherIntegration.xml',
        0
    ).get_data() ?? undefined
);

export class ShellIntegration {
    private impl: Gio.DBusExportedObject;
    private settings: Gio.Settings;

    public constructor() {
        this.impl = Gio.DBusExportedObject.wrapJSObject(
            ShellIntegrationInterface,
            this
        );

        this.settings = new Gio.Settings({schema_id: 'org.gnome.Weather'});

        this.settings.connect('changed::locations', () => {
            this.impl.emit_property_changed(
                'Locations',
                new GLib.Variant('av', this.Locations)
            );
        });
    }

    public export(connection: Gio.DBusConnection, path: string): void {
        return this.impl.export(connection, path);
    }

    public unexport(connection: Gio.DBusConnection): void {
        return this.impl.unexport_from_connection(connection);
    }

    public get AutomaticLocation(): boolean {
        // We follow whether the user has location services on.
        return true;
    }

    public get Locations(): GLib.Variant[] {
        return this.settings.get_value('locations').deep_unpack();
    }
}
