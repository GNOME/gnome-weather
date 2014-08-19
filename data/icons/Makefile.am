icondir = $(datadir)/icons

# I'd like to use nobase_dist_icon_DATA, but
# automake doesn't recognizes two prefixes at once
nobase_icon_DATA = \
	hicolor/16x16/apps/$(PACKAGE_NAME).Application.png \
	hicolor/22x22/apps/$(PACKAGE_NAME).Application.png \
	hicolor/32x32/apps/$(PACKAGE_NAME).Application.png \
	hicolor/48x48/apps/$(PACKAGE_NAME).Application.png \
	hicolor/256x256/apps/$(PACKAGE_NAME).Application.png \
	HighContrast/16x16/apps/$(PACKAGE_NAME).Application.png \
	HighContrast/22x22/apps/$(PACKAGE_NAME).Application.png \
	HighContrast/24x24/apps/$(PACKAGE_NAME).Application.png \
	HighContrast/32x32/apps/$(PACKAGE_NAME).Application.png \
	HighContrast/48x48/apps/$(PACKAGE_NAME).Application.png \
	HighContrast/256x256/apps/$(PACKAGE_NAME).Application.png

EXTRA_DIST = \
	$(nobase_icon_DATA) \
	hicolor/$(PACKAGE_NAME).Application.svg \
	HighContrast/$(PACKAGE_NAME).Application.svg

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

-include $(top_srcdir)/git.mk
