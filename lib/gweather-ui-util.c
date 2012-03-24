/* -*- Mode: C; tab-width: 8; indent-tabs-mode: t; c-basic-offset: 4 -*- */
/* FIXME: copyright header */

#include "config.h"

#include "gweather-ui-util.h"

#include <gdk-pixbuf/gdk-pixbuf.h>
#include <gtk/gtk.h>

/**
 * gweather_ui_util_load_gicon_to_clutter:
 * @icon:
 * @size:
 *
 * Returns: (transfer full):
 */
ClutterContent *
gweather_ui_util_load_gicon_to_clutter (GIcon *icon,
					gint   size)
{
    GtkIconTheme *theme;
    GtkIconInfo *info;
    GdkPixbuf *pixbuf;
    ClutterContent *image = NULL;
    GError *error = NULL;

    theme = gtk_icon_theme_get_default();
    info = gtk_icon_theme_lookup_by_gicon(theme, icon, size, 0);

    pixbuf = gtk_icon_info_load_icon(info, &error);
    if (error) {
	g_warning ("Error while loading GIcon: %s", error->message);
	goto out;
    }

    image = clutter_image_new ();
    clutter_image_set_data (CLUTTER_IMAGE (image),
			    gdk_pixbuf_get_pixels (pixbuf),
			    gdk_pixbuf_get_has_alpha (pixbuf) ?
			    COGL_PIXEL_FORMAT_RGBA_8888 :
			    COGL_PIXEL_FORMAT_RGB_888,
			    gdk_pixbuf_get_width (pixbuf),
			    gdk_pixbuf_get_height (pixbuf),
			    gdk_pixbuf_get_rowstride (pixbuf),
			    &error);

    if (error) {
	g_warning ("Error while submitting GIcon to GPU: %s", error->message);
	g_clear_object (&image);
    }

    g_object_unref (pixbuf);
 out:
    g_clear_error (&error);
    gtk_icon_info_free (info);

    return image;
}

