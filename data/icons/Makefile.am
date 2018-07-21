icondir = $(datadir)/icons

# I'd like to use nobase_dist_icon_DATA, but
# automake doesn't recognizes two prefixes at once
nobase_icon_DATA = \
	hicolor/scalable/apps/$(PACKAGE_NAME).svg \
	hicolor/symbolic/apps/$(PACKAGE_NAME)-symbolic.svg

gtk_update_icon_cache = gtk-update-icon-cache -f -t $(datadir)/icons/hicolor

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
