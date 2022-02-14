import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import GWeather from 'gi://GWeather';

import * as Util from '../misc/util.js';
import { LocationRow } from './locationRow.js';

GWeather.Location.prototype[Symbol.iterator] = function* () {
    let child = this.next_child(null);

    while (child != null) {
        yield child;
        child = this.next_child(child);
    }
}

function getAllCitiesAndWeatherStations() {
    const locations = new Set();
    for (const region of GWeather.Location.get_world()) {
        for (const country of region) {
            for (const location of country) {
                const level = location.get_level();
                if (level === GWeather.LocationLevel.ADM1) {
                    for (const cityOrStation of location) {
                        const level = cityOrStation.get_level();

                        if (level === GWeather.LocationLevel.CITY) {
                            locations.add(cityOrStation);
                        } else if (level === GWeather.LocationLevel.WEATHER_STATION) {
                            locations.add(cityOrStation);
                        }
                    }

                } else if (level === GWeather.LocationLevel.CITY) {
                    locations.add(location);
                } else if (level === GWeather.LocationLevel.WEATHER_STATION) {
                    locations.add(location);
                }
            }
        }
    }

    return [...locations.values()];
}

const LocationListModel = GObject.registerClass(
    {
        Implements: [Gio.ListModel]
    },
    class LocationListModel extends GObject.Object {
        constructor() {
            super();

            this._show_named_timezones = false;

            this._list = [];
        }

        /**
         * @this {ListModel & this}
         */
        load() {
            const items = getAllCitiesAndWeatherStations()
            this._list.push(...items);

            this.items_changed(0, 0, this._list.length);
        }

        vfunc_get_item_type() {
            return GWeather.Location.$gtype;
        }

        vfunc_get_n_items() {
            return this._list.length;
        }

        /**
         * @param {number} n 
         */
        vfunc_get_item(n) {
            return this._list[n] ?? null;
        }
    }
);

const locationListModel = new LocationListModel();
imports.mainloop.idle_add(() => {
    try {
        locationListModel.load();
    } catch (error) {
        console.error(error);
    }

    return false;
});

// Avoid the overhead of closures and Gtk.StringFilter

const LocationFilter = GObject.registerClass(
    class LocationFilter extends Gtk.Filter {
        constructor() {
            super();

            /** @type {WeakMap<GWeather.Location, string>} */
            this._itemMap = new WeakMap();
            this._filter = null;
            this._filterLowerCase = null;
        }

        setFilterString(filter) {
            if (filter !== this._filter) {
                this._filter = filter;
                this._filterLowerCase = this._filter?.toLowerCase() ?? null;
                this.changed(Gtk.FilterChange.DIFFERENT);
            }
        }

        vfunc_match(item) {
            if (!this._filter) return false;

            const cached = this._itemMap.get(item);
            const string = cached ?? item.get_name().toLowerCase();
            if (!cached)
                this._itemMap.set(item, string);

            return string.includes(this._filterLowerCase);
        }
    }
);

export const LocationSearchEntry = GObject.registerClass(
    {
        Properties: {
            'text': GObject.ParamSpec.string('text', 'text', 'text', GObject.ParamFlags.READWRITE, ''),
            'placeholder-text': GObject.ParamSpec.string('placeholder-text', 'placeholder-text', 'placeholder-text', GObject.ParamFlags.READWRITE, ''),
            'location': GObject.ParamSpec.object('location', 'location', 'location', GObject.ParamFlags.READWRITE, GWeather.Location.$gtype)
        },
        Signals: {
            'search-updated': { param_types: [GObject.String] },
        }
    },
    class LocationSearchEntry extends Adw.Bin {
        #entry = new Gtk.SearchEntry({
            hexpand: true,
        });
        #location = null;
        #listView = null;
        #text = '';

        #filter = new LocationFilter();
        #model = new Gtk.SingleSelection({
            selected: GLib.MAXUINT32,
            autoselect: false,
            model: new Gtk.FilterListModel({
                model: locationListModel,
                filter: this.#filter,
                incremental: true,
            })
        });
        #factory = new Gtk.SignalListItemFactory();

        constructor() {
            super();

            this.set_child(this.#entry);

            this.bind_property('placeholder-text', this.#entry, 'placeholder-text', GObject.BindingFlags.DEFAULT);
            this.bind_property('text', this.#entry, 'text', GObject.BindingFlags.BIDRECTIONAL);

            this.#entry.connect('search-changed', source => {
                const text = source.text || null;

                this.#filter.setFilterString(text);
                this.emit('search-updated', text);
            });

            this.#model.connect('notify::selected', ({ selectedItem }) => {
                if (selectedItem instanceof GWeather.Location) {
                    this.location = selectedItem;
                }
            });

            this.#factory.connect('setup', (_, item) => {
                const row = new LocationRow({ name: '', countryName: '' });
                item.set_child(row);
            });

            this.#factory.connect('bind', (_, { child, item }) => {
                if (child instanceof LocationRow && item instanceof GWeather.Location) {
                    const [name, countryName = ''] = Util.getNameAndCountry(item);

                    child.name = name;
                    child.countryName = countryName;
                }
            });
        }

        get text() {
            return this.#text;
        }

        set text(text) {
            this.#text = text;

            this.notify('text');
        }

        set location(location) {
            this.#location = location;

            this.notify('location');
        }

        get location() {
            return this.#location;
        }

        /**
         * @param {Gtk.ListView} listView 
         */
        setListView(listView) {
            if (this.#listView)
                this.#listView.model = null;

            this.#listView = listView;
            listView.factory = this.#factory;
            listView.model = this.#model;
        }

        vfunc_unroot() {
            if (this.#listView)
                this.#listView.model = null;

            super.vfunc_unroot();
        }
    }
);

LocationSearchEntry.set_layout_manager_type(Gtk.BinLayout);

