icondir = $(datadir)/icons/

# I'd like to use nobase_dist_icon_DATA, but
# automake doesn't recognizes two prefixes at once
nobase_icon_DATA = \
	hicolor/16x16/apps/gnome-weather.png \
	hicolor/22x22/apps/gnome-weather.png \
	hicolor/32x32/apps/gnome-weather.png \
	hicolor/48x48/apps/gnome-weather.png \
	hicolor/256x256/apps/gnome-weather.png

EXTRA_DIST = $(nobase_icon_DATA) hicolor/gnome-weather.svg

gtk_update_icon_cache = gtk-update-icon-cache -f -t $(datadir)/icons/hicolor; gtk-update-icon-cache -f -t $(datadir)/icons/HighContrast

install-data-hook: update-icon-cache
uninstall-hook: update-icon-cache
update-icon-cache:
	@-if test -z "$(DESTDIR)"; then \
		echo "Updating Gtk icon cache."; \
		$(gtk_update_icon_cache); \
	else \
		echo "*** Icon cache not updated.  After (un)install, run this:"; \
		echo "***   $(gtk_update_icon_cache)"; \
	fi
