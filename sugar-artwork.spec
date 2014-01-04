%define version 0.101.0
%define release_number 1
%define release_date 20140104
%define shortcommit 5d364de

Summary: Artwork for Sugar look-and-feel
Name: sugar-artwork
Version: %{version}
Release: %{release_number}.%{release_date}git%{shortcommit}%{?dist}
URL: http://sugarlabs.org
Group: User Interface/Desktops
License:  ASL 2.0
Source0: https://api.github.com/repos/sugarlabs/%{name}/tarball/%{shortcommit}

BuildRequires: gtk2-devel
BuildRequires: gtk3-devel
BuildRequires: xorg-x11-apps
BuildRequires: perl-XML-Parser
BuildRequires: python
BuildRequires: python-empy
BuildRequires: icon-naming-utils
BuildRequires: icon-slicer

Requires: gtk2 gtk3

%description
sugar-artwork contains the themes and icons that make up the OLPC default 
look and feel.

%prep
%setup -n sugarlabs-%{name}-%{shortcommit}

%build
./autogen.sh --prefix=%{_prefix} --libdir=%{_libdir}
make %{?_smp_mflags}

%install
make DESTDIR=%{buildroot} install

find %{buildroot} -name '*.la' -exec rm -f {} ';'

%post
touch --no-create %{_datadir}/icons/sugar || :
%{_bindir}/gtk-update-icon-cache --quiet %{_datadir}/icons/sugar || :

%postun
touch --no-create %{_datadir}/icons/sugar || :
%{_bindir}/gtk-update-icon-cache --quiet %{_datadir}/icons/sugar || :

%files
%defattr(-,root,root)
%doc README COPYING

%{_datadir}/icons/sugar
%{_datadir}/themes/sugar-100/gtk-2.0/gtkrc
%{_datadir}/themes/sugar-72/gtk-2.0/gtkrc
%{_libdir}/gtk-2.0/*/engines/*.so

#gtk3
%{_datadir}/themes/sugar-100/gtk-3.0/gtk.css
%{_datadir}/themes/sugar-100/gtk-3.0/gtk-widgets.css
%{_datadir}/themes/sugar-100/gtk-3.0/settings.ini
%{_datadir}/themes/sugar-100/gtk-3.0/assets/*
%{_datadir}/themes/sugar-72/gtk-3.0/gtk.css
%{_datadir}/themes/sugar-72/gtk-3.0/gtk-widgets.css
%{_datadir}/themes/sugar-72/gtk-3.0/settings.ini
%{_datadir}/themes/sugar-72/gtk-3.0/assets/*
