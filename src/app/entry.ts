import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import GWeather from 'gi://GWeather';

import * as Util from '../misc/util.js';
import { LocationRow } from './locationRow.js';

function* locationChildren(location: GWeather.Location) {
    let child = location.next_child(null);

    while (child != null) {
        yield child;
        child = location.next_child(child);
    }
}

function getAllCitiesAndWeatherStations() {
    const locations = new Set<GWeather.Location>();
    const world = GWeather.Location.get_world();

    if (world) {
        for (const region of locationChildren(world)) {
            for (const country of locationChildren(region)) {
                for (const location of locationChildren(country)) {
                    const level = location.get_level();
                    if (level === GWeather.LocationLevel.ADM1) {
                        for (const cityOrStation of locationChildren(location)) {
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
    }

    return [...locations.values()];
}

const LocationListModel = GObject.registerClass(
    {
        Implements: [Gio.ListModel]
    },
    class LocationListModel extends GObject.Object {
        _show_named_timezones: boolean;
        _list: GWeather.Location[];

        constructor() {
            super();

            this._show_named_timezones = false;
            this._list = [];
        }

        load() {
            const items = getAllCitiesAndWeatherStations()
            this._list.push(...items);

            // @ts-expect-error ts-for-gir interface stuff
            this.items_changed(0, 0, this._list.length);
        }

        vfunc_get_item_type() {
            return GWeather.Location.$gtype;
        }

        vfunc_get_n_items() {
            return this._list.length;
        }

        vfunc_get_item(n: number) {
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
        _itemMap: WeakMap<GWeather.Location, string>;
        _filter: string | null;
        _filterLowerCase: string | null;

        constructor() {
            super();

            this._itemMap = new WeakMap();
            this._filter = null;
            this._filterLowerCase = null;
        }

        setFilterString(filter: string | null) {
            if (filter !== this._filter) {
                this._filter = filter;
                this._filterLowerCase = this._filter?.toLowerCase() ?? null;
                this.changed(Gtk.FilterChange.DIFFERENT);
            }
        }

        vfunc_match(item: GWeather.Location) {
            if (!this._filter) return false;

            const cached = this._itemMap.get(item);
            const string = cached ?? item.get_name()?.toLowerCase();
            if (!cached && string)
                this._itemMap.set(item, string);

            if (this._filterLowerCase)
                return string?.includes(this._filterLowerCase) ?? false;
            else
                return false;
        }
    }
);

export class LocationSearchEntry extends Adw.Bin {
    #entry = new Gtk.SearchEntry({
        hexpand: true,
    });
    #location: GWeather.Location | null = null;
    #listView: Gtk.ListView | null = null;
    #text = '';

    #filter = new LocationFilter();
    #model = new Gtk.SingleSelection({
        selected: GLib.MAXUINT32,
        autoselect: false,
        model: new Gtk.FilterListModel({
            model: locationListModel as unknown as Gio.ListModel,
            filter: this.#filter,
            incremental: true,
        })
    });
    #factory = new Gtk.SignalListItemFactory();

    static {
        GObject.registerClass({
            Properties: {
                'text': GObject.ParamSpec.string('text', 'text', 'text', GObject.ParamFlags.READWRITE, ''),
                'placeholder-text': GObject.ParamSpec.string('placeholder-text', 'placeholder-text', 'placeholder-text', GObject.ParamFlags.READWRITE, ''),
                // @ts-expect-error ts-for-gir has incorrect typing for the `flags` param
                'location': GObject.ParamSpec.object('location', 'location', 'location', GObject.ParamFlags.READWRITE, GWeather.Location.$gtype)
            },
            Signals: {
                'search-updated': { param_types: [GObject.String.$gtype] },
            }
        }, this);
    }

    constructor() {
        super();

        this.set_child(this.#entry);

        this.bind_property('placeholder-text', this.#entry, 'placeholder-text', GObject.BindingFlags.DEFAULT);
        this.bind_property('text', this.#entry, 'text', GObject.BindingFlags.BIDIRECTIONAL);

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

        this.#factory.connect('setup', (_, item: Gtk.ListItem) => {
            const row = new LocationRow({ name: '', countryName: '' });
            item.set_child(row);
        });

        this.#factory.connect('bind', (_, { child, item }: Gtk.ListItem) => {
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

    setListView(listView: Gtk.ListView) {
        if (this.#listView)
            // @ts-expect-error ts-for-gir doesn't seem to handle nullability correctly
            // for these property getters/setters
            this.#listView.model = null;

        this.#listView = listView;
        listView.factory = this.#factory;
        listView.model = this.#model;
    }

    vfunc_unroot() {
        if (this.#listView)
            // @ts-expect-error ts-for-gir doesn't seem to handle nullability correctly
            // for these property getters/setters
            this.#listView.model = null;

        super.vfunc_unroot();
    }
};

LocationSearchEntry.set_layout_manager_type(Gtk.BinLayout.$gtype);

