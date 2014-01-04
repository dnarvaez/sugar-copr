%define version @version@
%define release_number @release_number@
%define release_date @release_date@
%define shortcommit @shortcommit@

%{!?python_sitelib: %global python_sitelib %(%{__python} -c "from distutils.sysconfig import get_python_lib; print(get_python_lib())")}

Summary: Constructionist learning platform
Name:    sugar
Version: %{version}
Release: %{release_number}.%{release_date}git%{shortcommit}%{?dist}
URL:     http://sugarlabs.org/
License: GPLv2+
Group:   User Interface/Desktops
Source0: https://api.github.com/repos/sugarlabs/%{name}/tarball/%{shortcommit}

BuildRequires: gettext
BuildRequires: GConf2-devel
BuildRequires: gobject-introspection
BuildRequires: gtk3-devel
BuildRequires: gtksourceview3-devel
BuildRequires: intltool
BuildRequires: perl-XML-Parser
BuildRequires: pkgconfig
BuildRequires: python
BuildRequires: autoconf
BuildRequires: automake

Requires: avahi-tools
Requires: dbus-x11
Requires: ethtool
Requires: gnome-keyring-pam
Requires: gstreamer-plugins-espeak
Requires: gtksourceview3
Requires: gvfs
Requires: gwebsockets
Requires: libwnck3
Requires: libxklavier
Requires: metacity
Requires: NetworkManager
Requires: openssh
Requires: python-telepathy
Requires: sugar-artwork
Requires: sugar-toolkit-gtk3
Requires: telepathy-mission-control
Requires: upower
Requires: xdg-user-dirs

BuildArch: noarch

%description
Sugar provides simple yet powerful means of engaging young children in the 
world of learning that is opened up by computers and the Internet. With Sugar,
even the youngest learner will quickly become proficient in using the 
computer as a tool to engage in authentic problem-solving.  Sugar promotes 
sharing, collaborative learning, and reflection, developing skills that help 
them in all aspects of life. 

Sugar is also the learning environment for the One Laptop Per Child project. 
See http://www.laptop.org for more information on this project.

%package cp-all
Summary: All control panel modules 
Group: User Interface/Desktops
Requires: %{name} = %{version}-%{release}
Requires: %{name}-cp-background %{name}-cp-datetime %{name}-cp-frame %{name}-cp-language
Requires: %{name}-cp-modemconfiguration %{name}-cp-network %{name}-cp-keyboard
Requires: %{name}-cp-webaccount %{name}-cp-updater

%description cp-all
This is a meta package to install all Sugar Control Panel modules

%package cp-background
Summary: Sugar Background control panel
Group: User Interface/Desktops
Requires: %{name} = %{version}-%{release}

%description cp-background
This is the Sugar control panel to change the background

%package cp-datetime
Summary: Sugar Date and Time control panel
Group: User Interface/Desktops
Requires: %{name} = %{version}-%{release}

%description cp-datetime
This is the Sugar Date and Time settings control panel

%package cp-frame
Summary: Sugar Frame control panel
Group: User Interface/Desktops
Requires: %{name} = %{version}-%{release}

%description cp-frame
This is the Sugar Frame settings control panel

%package cp-keyboard
Summary: Sugar Keyboard control panel
Group: User Interface/Desktops
Requires: %{name} = %{version}-%{release}

%description cp-keyboard
This is the Sugar Keyboard settings control panel

%package cp-language
Summary: Sugar Language control panel
Group: User Interface/Desktops
Requires: %{name} = %{version}-%{release}

%description cp-language
This is the Sugar Language settings control panel

%package cp-modemconfiguration
Summary: Sugar Modem configuration control panel
Group: User Interface/Desktops
Requires: %{name} = %{version}-%{release}

%description cp-modemconfiguration
This is the Sugar Modem configuration control panel

%package cp-network
Summary: Sugar Network control panel
Group: User Interface/Desktops
Requires: %{name} = %{version}-%{release}

%description cp-network
This is the Sugar Network settings control panel

%package cp-power
Summary: Sugar Power control panel
Group: User Interface/Desktops
Requires: %{name} = %{version}-%{release}

%description cp-power
This is the Sugar Power settings control panel

%package cp-updater
Summary: Sugar Activity Update control panel
Group: User Interface/Desktops
Requires: %{name} = %{version}-%{release}

%description cp-updater
This is the Sugar Activity Updates control panel

%package cp-webaccount
Summary: Sugar Web Account control panel
Group: User Interface/Desktops
Requires: %{name} = %{version}-%{release}

%description cp-webaccount
This is the Sugar Web Account control panel

%prep
%setup -n sugarlabs-%{name}-%{shortcommit}

%build
./autogen.sh --prefix=%{_prefix} --sysconfdir=%{_sysconfdir}
make

%install
export GCONF_DISABLE_MAKEFILE_SCHEMA_INSTALL=1
make install DESTDIR=%{buildroot}
mkdir %{buildroot}/%{_datadir}/sugar/activities
unset GCONF_DISABLE_MAKEFILE_SCHEMA_INSTALL

%find_lang %{name}

%post
if (update-mime-database -v &> /dev/null); then
  update-mime-database "%{_datadir}/mime" > /dev/null
fi

export GCONF_CONFIG_SOURCE=`gconftool-2 --get-default-source`
gconftool-2 --makefile-install-rule \
	%{_sysconfdir}/gconf/schemas/sugar.schemas > /dev/null || :

%pre
if [ "$1" -gt 1 ]; then
    export GCONF_CONFIG_SOURCE=`gconftool-2 --get-default-source`
    gconftool-2 --makefile-uninstall-rule \
      %{_sysconfdir}/gconf/schemas/sugar.schemas > /dev/null || :
fi

%preun
if [ "$1" -eq 0 ]; then
    export GCONF_CONFIG_SOURCE=`gconftool-2 --get-default-source`
    gconftool-2 --makefile-uninstall-rule \
      %{_sysconfdir}/gconf/schemas/sugar.schemas > /dev/null || :
fi

%postun
if (update-mime-database -v &> /dev/null); then
  update-mime-database "%{_datadir}/mime" > /dev/null
fi

%files -f %{name}.lang
%doc COPYING

%config %{_sysconfdir}/dbus-1/system.d/nm-user-settings.conf
%config %{_sysconfdir}/gconf/schemas/sugar.schemas

%dir %{_datadir}/sugar
%dir %{_datadir}/sugar/activities
%{_datadir}/sugar/*

%{python_sitelib}/*

%{_datadir}/xsessions/sugar.desktop
%{_datadir}/GConf/gsettings/sugar-schemas.convert
%{_datadir}/glib-2.0/schemas/org.sugarlabs.gschema.xml

%{_bindir}/*
%dir %{_datadir}/sugar/extensions/cpsection/
%exclude %{_datadir}/sugar/extensions/cpsection/[b-z]*
%{_datadir}/sugar/extensions/cpsection/aboutcomputer
%{_datadir}/sugar/extensions/cpsection/aboutme

%{_datadir}/mime/packages/sugar.xml

%files cp-all

%files cp-background
%{_datadir}/sugar/extensions/cpsection/background

%files cp-datetime
%{_datadir}/sugar/extensions/cpsection/datetime

%files cp-frame
%{_datadir}/sugar/extensions/cpsection/frame

%files cp-keyboard
%{_datadir}/sugar/extensions/cpsection/keyboard

%files cp-language
%{_datadir}/sugar/extensions/cpsection/language

%files cp-modemconfiguration
%{_datadir}/sugar/extensions/cpsection/modemconfiguration

%files cp-network
%{_datadir}/sugar/extensions/cpsection/network

%files cp-power
%{_datadir}/sugar/extensions/cpsection/power

%files cp-updater
%{_datadir}/sugar/extensions/cpsection/updater

%files cp-webaccount
%{_datadir}/sugar/extensions/cpsection/webaccount
