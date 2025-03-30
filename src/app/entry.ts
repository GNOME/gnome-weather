import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import GWeather from 'gi://GWeather';

import * as Util from '../misc/util.js';
import {LocationRow} from './locationRow.js';

function* locationChildren(
    location: GWeather.Location
): Generator<GWeather.Location> {
    let child = location.next_child(null);

    while (child != null) {
        yield child;
        child = location.next_child(child);
    }
}

function getAllCitiesAndWeatherStations(): GWeather.Location[] {
    const locations = new Set<GWeather.Location>();
    const world = GWeather.Location.get_world();

    if (world) {
        for (const region of locationChildren(world)) {
            for (const country of locationChildren(region)) {
                for (const location of locationChildren(country)) {
                    const level = location.get_level();
                    if (level === GWeather.LocationLevel.ADM1) {
                        for (const cityOrStation of locationChildren(
                            location
                        )) {
                            const level = cityOrStation.get_level();

                            if (level === GWeather.LocationLevel.CITY) {
                                locations.add(cityOrStation);
                            } else if (
                                level === GWeather.LocationLevel.WEATHER_STATION
                            ) {
                                locations.add(cityOrStation);
                            }
                        }
                    } else if (level === GWeather.LocationLevel.CITY) {
                        locations.add(location);
                    } else if (
                        level === GWeather.LocationLevel.WEATHER_STATION
                    ) {
                        locations.add(location);
                    }
                }
            }
        }
    }

    return [...locations.values()];
}

class LocationListModel extends GObject.Object {
    private list: GWeather.Location[];

    static {
        GObject.registerClass(
            {
                Implements: [Gio.ListModel],
            },
            this
        );
    }

    public constructor() {
        super();

        this.list = [];
    }

    public load(): void {
        const items = getAllCitiesAndWeatherStations();
        this.list.push(...items);

        // @ts-expect-error ts-for-gir interface stuff
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        this.items_changed(0, 0, this.list.length);
    }

    public vfunc_get_item_type(): GObject.GType {
        return GWeather.Location.$gtype;
    }

    public vfunc_get_n_items(): number {
        return this.list.length;
    }

    public vfunc_get_item(n: number): GWeather.Location | null {
        return this.list[n] ?? null;
    }
}

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

class LocationFilter extends Gtk.Filter {
    private itemMap: WeakMap<GWeather.Location, string>;
    private filter?: string;
    private filterLowerCase?: string;

    static {
        GObject.registerClass(this);
    }

    public constructor() {
        super();

        this.itemMap = new WeakMap();
    }

    public setFilterString(filter: string): void {
        if (filter !== this.filter) {
            this.filter = filter;
            this.filterLowerCase = this.filter?.toLowerCase() ?? null;
            this.changed(Gtk.FilterChange.DIFFERENT);
        }
    }

    public vfunc_match(item: GWeather.Location): boolean {
        if (!this.filter) return false;

        const cached = this.itemMap.get(item);
        const string = cached ?? item.get_name()?.toLowerCase();
        if (!cached && string) this.itemMap.set(item, string);

        if (this.filterLowerCase)
            return string?.includes(this.filterLowerCase) ?? false;
        else return false;
    }
}

export class LocationSearchEntry extends Adw.Bin {
    private _text: string;
    private _location?: GWeather.Location;

    private entry: Gtk.SearchEntry;
    private listView?: Gtk.ListView;
    private filter: LocationFilter;
    private model: Gtk.SingleSelection;
    private factory: Gtk.SignalListItemFactory;

    static {
        GObject.registerClass(
            {
                Properties: {
                    text: GObject.ParamSpec.string(
                        'text',
                        'text',
                        'text',
                        GObject.ParamFlags.READWRITE,
                        ''
                    ),
                    'placeholder-text': GObject.ParamSpec.string(
                        'placeholder-text',
                        'placeholder-text',
                        'placeholder-text',
                        GObject.ParamFlags.READWRITE,
                        ''
                    ),
                    location: GObject.ParamSpec.object(
                        'location',
                        'location',
                        'location',
                        GObject.ParamFlags.READWRITE,
                        GWeather.Location.$gtype
                    ),
                },
                Signals: {
                    'search-updated': {param_types: [GObject.String.$gtype]},
                },
            },
            this
        );
    }

    public constructor() {
        super();

        this._text = '';
        this.entry = new Gtk.SearchEntry({
            hexpand: true,
        });

        this.filter = new LocationFilter();
        this.model = new Gtk.SingleSelection({
            selected: GLib.MAXUINT32,
            autoselect: false,
            model: new Gtk.FilterListModel({
                model: locationListModel as unknown as Gio.ListModel,
                filter: this.filter,
                incremental: true,
            }),
        });

        this.factory = new Gtk.SignalListItemFactory();

        this.set_child(this.entry);

        this.bind_property(
            'placeholder-text',
            this.entry,
            'placeholder-text',
            GObject.BindingFlags.DEFAULT
        );
        this.bind_property(
            'text',
            this.entry,
            'text',
            GObject.BindingFlags.BIDIRECTIONAL
        );

        this.entry.connect('search-changed', source => {
            this.filter.setFilterString(source.text);
            this.emit('search-updated', source.text);
        });

        this.model.connect('notify::selected', ({selectedItem}) => {
            if (selectedItem instanceof GWeather.Location) {
                this.location = selectedItem;
            }
        });

        this.factory.connect('setup', (_, item: Gtk.ListItem) => {
            const row = new LocationRow({name: '', countryName: ''});
            item.set_child(row);
        });

        this.factory.connect('bind', (_, {child, item}: Gtk.ListItem) => {
            if (
                child instanceof LocationRow &&
                item instanceof GWeather.Location
            ) {
                const [name, countryName = ''] = Util.getNameAndCountry(item);

                child.name = name;
                child.countryName = countryName;
            }
        });
    }

    public get text(): string {
        return this._text;
    }

    public set text(text) {
        this._text = text;

        this.notify('text');
    }

    public set location(location) {
        this._location = location;

        this.notify('location');
    }

    public get location(): GWeather.Location | undefined {
        return this._location;
    }

    public setListView(listView: Gtk.ListView): void {
        if (this.listView) this.listView.set_model(null);

        this.listView = listView;
        listView.factory = this.factory;
        listView.model = this.model;
    }

    public vfunc_unroot(): void {
        if (this.listView) this.listView.set_model(null);

        super.vfunc_unroot();
    }
}

LocationSearchEntry.set_layout_manager_type(Gtk.BinLayout.$gtype);
