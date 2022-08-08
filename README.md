# Weather

Monitor the current weather conditions for your city, or anywhere in the world.

## Useful links

**Homepage**: https://wiki.gnome.org/Apps/Weather

**Report issues**: https://gitlab.gnome.org/GNOME/gnome-weather/issues/

**Donate**: https://www.gnome.org/friends/

**Translate**: https://wiki.gnome.org/TranslationProject

## Installation

There are two supported ways to install Weather:

### Stable Release

The latest stable release is available on Flathub:

<a href='https://flathub.org/apps/details/org.gnome.Weather'><img width='240' alt='Download on Flathub' src='https://flathub.org/assets/badges/flathub-badge-i-en.png'/></a>

### Development Snapshot

This is for testing only. To start, add the GNOME nightly repository:

```
$ flatpak remote-add gnome-nightly https://nightly.gnome.org/gnome-nightly.flatpakrepo
```

Then, run the following command to install the development version of Weather:

```
$ flatpak install org.gnome.WeatherDevel
```

## Hacking on Weather

To start working on Weather see the [general guide](https://wiki.gnome.org/Newcomers/BuildProject) for building GNOME apps
with Flatpak and GNOME Builder. Then, [find a task](https://gitlab.gnome.org/GNOME/gnome-weather/issues?label_name%5B%5D=4.+Newcomers) to work on.

If you're unfamiliar with GJS, here are a few good places to start:

* The [beginner-level guide](https://gjs-guide.gitlab.io/) for working with GJS
* An overview of [working with GNOME APIs via GJS](https://gitlab.gnome.org/GNOME/gjs/wikis/Mapping)
* The [documentation for various GNOME libraries](https://devdocs.baznga.org/) in JavaScript

## Communication

If you want to chat with the maintainers, we're on Matrix at [#weather:gnome.org](https://matrix.to/#/#weather:gnome.org)

