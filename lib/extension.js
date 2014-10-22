(function() {

// Reset cookies when marking forums read (otherwise the cookie will fill up and break):
$(document).on( 'mousedown', '#vbalink_mfr a', function() {
    document.cookie='bb_thread_lastview=';
});
// Even if the user doesn't mark forums read, remove the oldest 50% of cookies if the cookie gets too long:
document.cookie.replace( /(?:^|; *)(bb_thread_lastview=[-a-f0-9]+%7B)([^;]{4,})%7D/, function( match, prefix, value ) {
    var times = [];
    value.replace( /i-[0-9]+_i-([0-9]+)_/g, function( match, time ) { times.push(parseInt(time,10)); });
    var median_time = times.sort()[ Math.floor( times.length / 2 ) ];
    document.cookie = prefix + value.replace( /i-[0-9]+_i-([0-9]+)_/g, function( match, time ) { return parseInt(time,10) < median_time ? '' : match }) + '%7D';
});

function disable_page_exit_confirmation() {
    // vBulletin likes to trigger the "beforeunload" warning when leaving some pages
    BabelExt.utils.runInEmbeddedPage( 'YAHOO.util.Event.removeListener(window,"beforeunload")');
}

/*
 * Fix the "new private message" popup:
 * a) stop it from breaking the "back" button when redirecting
 * b) remove the "would you like a popup?" popup that breaks in modern browsers
 *
 * this works by overriding the confirm() dialogue with our own function,
 * but as the function needs to be called from unprivileged code,
 * we have to inject it as a string into the unprivileged DOM (yuck!)
 *
 */
BabelExt.utils.runInEmbeddedPage(
    'window.real_confirm = window.confirm;' +
        'window.confirm = ' + function(message) {
            if ( message.search("You have a new private message.\n\n") == 0 ) {
                if ( window.real_confirm(message) ) {
                    var scripts = document.body.getElementsByTagName('script');
                    for ( var n=scripts.length-1; n>=0; --n ) {
                        var match = scripts[n].textContent.match( 'window.location = "([^\"]*)' );
                        if ( match ) {
                            setTimeout(function() { window.location = match[1]; }, 0 );
                            return false;
                        }
                    }
                    return true;
                }
                return false;
            } else {
                return window.real_confirm( message );
            }
        }
);

/*
 * FORUM DISPLAY PAGE
 */
BabelExt.utils.dispatch(

    { // forum permalink:
        match_pathname: '/forumdisplay.php',
        match_elements: '#breadcrumb .lastnavbit span',
        callback: function(stash, pathname, params, navbit) {
            $(navbit)
                .wrap('<div class="lastnavbit"></div>')
                .closest('li')
                .removeClass('lastnavbit')
                .after( '<li class="navbit lastnavbit"><a href="forumdisplay.php?f=' + encodeURIComponent(params.f) + '" title="shareable link for this forum">[permalink]</a></li>' );
        }
    },
    { // (Un-)ignore forums button
        match_pathname: '/forumdisplay.php',
        match_elements: [ '#below_threadlist' ],
        pass_storage: ['ignored-forums', 'ignorable-forum-list'],
        callback: function(stash, pathname, params, below_threadlist, ignored_forums, ignorable_forum_list) {

            var forum_id = params.f;
            var forums = forum_id;

            ignorable_forum_list = JSON.parse(ignorable_forum_list || '{}');

            if ( !ignored_forums ) ignored_forums = '';
            if ( !ignorable_forum_list ) ignorable_forum_list = {};
            $('.forumtitle a').each(function() {
                var id = this.href.split('?f=')[1];
                ignorable_forum_list[id] = this.textContent;
                forums += ',' + id;
            });
            $('.navbit a').not('[title]').each(function() { // parent forums, not including the permalink
                var id = this.href.split('?f=')[1];
                if ( id )
                    ignorable_forum_list[id] = this.textContent;
            });

            ignorable_forum_list[forum_id] = $('.lastnavbit span').text();

            BabelExt.storage.set( 'ignorable-forum-list', JSON.stringify(ignorable_forum_list) );

            var ignore_html = (
                ( ( ignored_forums || '' ).search( ' ' + forum_id + ' ' ) == -1 )
                ? ' rel="nofollow" href="subscription.php?do=removesubscription&amp;f=' + encodeURIComponent(forums) + '&amp;ignore=1">Ignore this Forum</a>' // not ignored
                : ' rel="nofollow" href="subscription.php?do=removesubscription&amp;f=' + encodeURIComponent(forums) + '&amp;ignore=0">Unignore this Forum</a>' // ignored (and therefore not subscribed)
            );

            var threadlist_controls = $('#above_threadlist_controls');
            if ( threadlist_controls.length == 0 ) // e.g. http://forums.frontier.co.uk/forumdisplay.php?f=46 has no controls
                threadlist_controls =
                $(
                    '<div class="above_threadlist_controls toolsmenu" id="above_threadlist_controls"><div class="popupgroup">' +
	                '<a class="popupctrl" style="float:right;padding:5px"' + ignore_html +
                    '</div></div>'
	        ).insertAfter('#pagetitle');
            else
                threadlist_controls.find('a[href^="subscription.php"]').last().closest('li').after( '<li><a ' + ignore_html );
        }
    }
);

/*
 * SEARCH PAGE
 */
BabelExt.utils.dispatch(
    {
        match_pathname: '/search.php',
        match_elements: [ '#breadcrumb .lastnavbit span', '#pagetitle' ],
        callback: function(stash, pathname, params, navbit, pagetitle) {

            $(pagetitle).find('.description').text().replace( /^\s*(?:Type: ([^;]+);|)\s*(.*?)\s*$/, function( match, type, subtype ) {

                var permalink = '/search.php?';

                if ( !type ) type = '';

                if ( type.search( 'Posts'            ) != -1 ) permalink += 'contenttypeid[]=1&';
                if ( type.search( 'Forums'           ) != -1 ) permalink += 'contenttypeid[]=3&';
                if ( type.search( 'Visitor Messages' ) != -1 ) permalink += 'contenttypeid[]=11&';
                if ( type.search( 'Forum Threads'    ) != -1 ) permalink += 'contenttype=vBForum_Thread&'; // search for threads started by a user

                if ( subtype.search(/^User: /) == 0 ) {
                    permalink += 'do=finduser&userid=' + encodeURIComponent($(pagetitle).find('.description a').attr('href').substr(13)) + (
                        ( type == 'Posts'         ) ? '&showposts=1'   :
                        ( type == 'Forum Threads' ) ? '&starteronly=1' :
                        ''
                    );
                } else {
                    switch ( subtype ) {
                    case 'New Posts'          : permalink += 'do=getnew'; break;
                    case 'Posts From Last Day': permalink += 'do=getdaily'; break;
                    default:
                        var query = $(pagetitle).find('h1 a').attr( 'href' ).split('?')[1].split('&'),
                            defaults = {
                                // forum v4:
                                'childforums=0': 1,
                                'replyless=0': 1,
                                'replylimit=0': 1,
                                'saveprefs=0': 1, // never put saveprefs in the permalink
                                'saveprefs=1': 1,
                                'search_type=1': 1,
                                'showposts=0': 1,
                                'type[]=1': 1,
                                'forumchoice[]=': 1,
                                'sortorder=descending': 1,
                                'searchdate=0': 1,
                                'beforeafter=after': 1,
                                'titleonly=0': 1,
                                'starteronly=0': 1,
                                'exactname=0': 1,
                                '': 1
                            },
                            exact_name_position = 0,
                            exact_name_value = ''
                        ;

                        permalink += 'do=process';
                        var permalink_extra = '';
                        for ( var n=0; n!=query.length; ++n ) {
                            if ( query[n] == 'exactname=1' || query[n].search( /^(userid=[^0]|searchuser=)/ ) == 0  ) {
                                // put 'exact_name' next to the name we're searching for, so it's clearer what it does:
                                permalink_extra += query[n];
                                continue;
                            } else if ( defaults.hasOwnProperty(query[n]) || query[n].search( /^humanverify\[\]=/ ) == 0 ) {
                                continue; // never put humanverify in the permalink
                            } else if ( query[n].search( /^query=/ ) == 0  ) {
                                params.search_term = query[n].substr(6); // trigger the Google handler, below
                            }
                            permalink += '&' + query[n];
                        }
                        permalink += permalink_extra;

                    }
                }

                var element =
                    $( '<li class="navbit lastnavbit"><a href="'+permalink+'" title="shareable link for this search">[permalink]</a></li>' )
                    .insertAfter(
                        $(navbit)
                            .wrap('<div class="lastnavbit"></div>')
                            .closest('li')
                            .removeClass('lastnavbit')
                    );

                // Intercept F5 and make it re-run the current search instead of showing the cached search:
                $(document).on("keydown", function(event) {
                    switch (event.which) {
                    case 82 : // Macs use Cmd+R to refresh
                        if ( !event.ctrlKey ) return;
                        // FALL THROUGH
                    case 116: // F5
                        $('#searchbits').empty().load( permalink + ' #searchbits' );
                        event.preventDefault();
                    }
                });

            });

        }
    },
    {
        match_pathname: '/search.php',
        match_elements: '#postpagestats',
        match_params: {
            search_term: true // set by the handler above
        },
        callback: function(stash, pathname, params, footer) {
            $(footer).append(
                // note: params.search_term has already been extracted from one query string, so doesn't need to be re-escaped here:
                ' - didn\'t find what you were looking for?  <a href="https://www.google.com/search?q=site:forums.frontier.co.uk+' + params.search_term + '">search with Google</a>'
            );
        }
    }
);


/*
 * SHOW THREAD PAGE
 */

BabelExt.utils.dispatch(
    { // intercept the code that reimplements #post12345 in Javascript:
        match_pathname: '/showthread.php',
        match_elements: 'body',
        callback: function(stash, pathname, params, body) {

            var onload = body.getAttribute("onload");
            if ( onload )
                body.setAttribute(
                    'onload',
                    onload.replace(
                            /if \(document.body\.scrollIntoView && fetch_object\('currentPost'\) && \(window\.location\.href\.indexOf\('#'\) == -1 \|\| window\.location\.href\.indexOf\('#post'\) > -1\)\) { fetch_object\('currentPost'\)\.scrollIntoView\(true\); }/,
                        ''
                    )
                );

        }
    },

    {
        match_pathname: '/showthread.php',
        match_elements: [ '#breadcrumb .lastnavbit span' ],
        callback: function(stash, pathname, params, navbit) {
            $(navbit)
                .wrap('<div class="lastnavbit"></div>')
                .closest('li')
                .removeClass('lastnavbit')
                .after( '<li class="navbit lastnavbit"><a href="showthread.php?t='+encodeURIComponent(params.t)+'" title="shareable link for this thread">[permalink]</a></li>' );
        }
    },

    { // thumbnailise large images
        match_pathname: '/showthread.php',
        match_elements: '#posts',
        pass_preferences: [ 'thumbnailise-enabled', 'thumbnailise-width', 'thumbnailise-height', 'thumbnailise-units' ],
        callback: function(stash, pathname, params, posts, enabled, min_width, min_height, units) {

            if ( !enabled ) return;

            $("head").append("<style type='text/css'>.size-toggle img { border: 1px solid blue }</style>");

            if ( units == 'viewport' ) {
                min_width  *= $(window).width () / 100;
                min_height *= $(window).height() / 100;
            }

            $(document).on( 'click', '.size-toggle', function(event) {
                $(this).find('img')
                    .removeAttr( 'width' )
                    .removeAttr( 'height' )
                    .unwrap()
                ;
                event.preventDefault();
            });

            function fix_image(img) {
                $(img).addClass( 'already-filtered' );
                if ( $(img).closest('.spoiler').length ) return; // ignore images inside [spoiler] tags
                if ( img.width > min_width || img.height > min_height ) {
                    $(img).attr( ( img.width > img.height ? 'width' : 'height' ), 100 );
                    var a = $(img).closest('a');
                    if ( !a.length ) a = $(img).wrap('<a href="#full-size">').parent();
                    a.addClass('size-toggle').attr('title', 'click the image to show full-size' );
                }
            }

            var waiting_images = [], waiting_interval;
            function observe_mutation() {
                $('.postcontent img',posts).not('.already-filtered').each(function() {
                    if ( this.width )
                        fix_image(this);
                    else {
                        // images that haven't started loading yet
                        waiting_images.push(this);
                        if ( !waiting_interval )
                            waiting_interval = setInterval(
                                function() {
                                    for ( var n=0; n!=waiting_images.length; ++n ) {
                                        if ( waiting_images[n].width )
                                            fix_image( waiting_images.splice( n--, 1 )[0] );
                                    }
                                    if ( !waiting_images.length ) {
                                        clearInterval(waiting_interval);
                                        waiting_interval = undefined;
                                    }
                                }, 25
                            );
                    }

                });
            }
            observe_mutation();

            var observer;
            if      ( typeof(      MutationObserver) != 'undefined' ) observer = new       MutationObserver(observe_mutation);
            else if ( typeof(WebKitMutationObserver) != 'undefined' ) observer = new WebKitMutationObserver(observe_mutation);
            else return;
            observer.observe(posts, { childList: true });
            $(function() { observe_mutation(); observer.disconnect() });

        }
    },

    {
        match_pathname: '/showthread.php',
        match_elements: '#searchthread',
        pass_storage: [ 'ignored-threads' ],
        callback: function(stash, pathname, params, search, ignored_threads) {
            var thread_id = encodeURIComponent(params.t);
            $('#threadtools a[href^="subscription.php"]').last().closest('li').after(
                (
                    ( !ignored_threads || ignored_threads.search( ' ' + thread_id + ' ' ) == -1 )
                        ? '<li><a rel="nofollow" href="subscription.php?do=removesubscription&amp;t=' + thread_id + '&amp;ignore=1">Ignore this Thread</a>' // not ignored
                        : '<li><a rel="nofollow" href="subscription.php?do=removesubscription&amp;t=' + thread_id + '&amp;ignore=0">Unignore this Thread</a>' // ignored (and therefore not subscribed)
                ) +
                '<li><a href="/misc.php?do=whoposted&amp;t=' + thread_id + '">Who posted in this thread?</a>'
            );
        }
    },

    {
        match_pathname: '/showthread.php',
        match_elements: '.postlistfoot',
        pass_storage: [ 'ignored-threads' ],
        pass_preferences: [ 'superignore-users' ],
        callback: function(stash, pathname, params, footer, ignored_threads, do_super_ignore) {

            var thread_id = encodeURIComponent(params.t);

            // Blur spoilers when you forget about them:
            $(document).on( 'focus', '.spoiler input', function() {
                var button = this;
                $(window).one( 'scroll', function() { $(button).blur() });
            });

            if ( do_super_ignore ) $('#posts .postbitignored').remove();

            $('.postcontainer').each(function() {

                var username = $('.username',this);

                if ( username.hasClass('guest') ) return;

                var post_id = encodeURIComponent(this.id.substr(5)),
                    user_id = encodeURIComponent(username.attr('href').substr(13))
                ;

                $('.memberaction_body a[href^="private.php"]',this).first().closest('li').after(
                    '<li class="right"><a rel="nofollow" title="View all posts made by this user in the current thread" class="siteicon_forum" href="search.php?do=finduser&amp;userid='+user_id+'&amp;searchthreadid='+thread_id+'&amp;contenttype=vBForum_Post&amp;showposts=1">View Thread Posts</a></li>'
                );

                $('.postlinking',this).append( '<a class="blog" title="shareable link for this post" href="showthread.php?p=' + post_id + '#post' + post_id + '">[permalink]</a>' );

                $('.postcontrols a',this).each(function() {
                    if ( this.href.search( '/newreply' ) != -1 )
                        this.href += '&u=' + user_id + '&username=' + encodeURIComponent(username.text());
                });

            });

        }
    }

);

/*
 * SUBSCRIPTION PAGES
 */
BabelExt.utils.dispatch(
    { // unignore when adding a subscription
        match_pathname: '/subscription.php',
        match_params: {
            'do': 'addsubscription'
        },
        callback: function(stash, pathname, params) {
            params.ignore = 0;
        }
    },

    { // (un-)ignore threads
        match_pathname: '/subscription.php',
        match_params: {
            ignore: true,
            t: true
        },
        pass_storage: ['ignored-threads'],
        callback: function(stash, pathname, params, ignored_threads) {
            ignored_threads = ( ignored_threads || ' ' ).replace( ' ' + params.t + ' ', ' ' );
            BabelExt.storage.set(
                'ignored-threads',
                ( params.ignore == '1' )
                ? ignored_threads + params.t + ' '
                : ignored_threads
            );
        }
    },

    { // (un-)ignore forums
        match_pathname: '/subscription.php',
        match_params: {
            ignore: true,
            f: true
        },
        pass_storage: ['ignored-forums'],
        callback: function(stash, pathname, params, ignored_forums) {
            ignored_forums = ( ignored_forums || ' ' );
            var forums = params.f.split(',');
            for ( var n=0; n!=forums.length; ++n )
                ignored_forums = ignored_forums.replace( ' ' + forums[n] + ' ', ' ' );
            BabelExt.storage.set(
                'ignored-forums',
                ( params.ignore == '1' )
                    ? ignored_forums + forums.join(' ') + ' '
                    : ignored_forums
            );
        }
    },

    { // remove subscription
        match_pathname: '/subscription.php',
        match_params: {
            'do': 'removesubscription',
        },
        callback: function(stash, pathname, params) {
            if ( !params.hasOwnProperty('ignore') || params.ignore == '1' ) {
                // Going back to the page you just unsubscribed from only encourages you to get back into it.
                // Going to the "manage subscriptions" page makes thread super-ignore more findable
                setTimeout( function() { document.location = '/subscription.php?do=viewsubscription'; }, 2000 );
                // Stop the page content from redirecting:
                BabelExt.utils.runInEmbeddedPage('window.setTimeout = function() {};');
            }
        }
    }

);

/*
 * ALL LISTING PAGES
 */
BabelExt.utils.dispatch(
    {  // Hide threads
        match_pathname: [ '/forumdisplay.php', '/search.php', '/subscription.php' ],
        match_elements: '.forumfoot,.blockfootpad',
        pass_storage: [ 'ignored-threads', 'ignored-forums' ],
        pass_preferences: [ 'superignore-threads' ],
        callback: function(stash, pathname, params, footer, ignored_threads, ignored_forums, do_super_ignore) {

            function ignored_to_elements( ignored, selector_pattern ) {
                // Convert a string of ignored IDs to a jQuery selector full of matching elements
                if ( ignored )
                    return $('#threads,#searchbits').find(
                        ignored.substr(1,ignored_threads.length-2)
                            .replace( / /g, ',' )
                            .replace( /([0-9]+)/g, selector_pattern )
                    );
                else
                    return $();
            }

            var ignored = (
                ignored_to_elements( ignored_threads, '#thread_$1' ).add(
                ignored_to_elements( ignored_forums, 'a[href="forumdisplay.php?f=$1"]' ).closest('li')
                )
            );

            ignored
                .children()
                .css({ 'opacity': 0.5 })
                .each(function() {
                    $(this).html('<div style="margin: 0 1em">Ignored: '+$('.title',this).html()+'</div>');
                });

            function do_ignore() {
                if ( do_super_ignore )
                    ignored.hide();
                else
                    ignored.show();
            }
            do_ignore();

            $(
                '<li class="threadbit"><div class="icon0 rating0 nonsticky"><div style="margin: 0 1em; padding: 4px"><input type="checkbox" id="super-ignore"><label for="super-ignore" style="vertical-align: bottom"> Hide ignored threads completely (&ldquo;super-ignore&rdquo;)</label></div></div></li>'
            )
                .appendTo('#threads,#searchbits')
                .find('input').change(function() {
                    BabelExt.preferences.set( 'superignore-threads', do_super_ignore = $('#super-ignore').is(':checked'), do_ignore );
                })
                .prop('checked', do_super_ignore)

        }
    }
);


/*
 * IGNORE LIST PAGE
 */
BabelExt.utils.dispatch(
    {
        match_pathname: '/profile.php',
        match_params: {
            'do': 'ignorelist'
        },
        match_elements: '#ignorelist_add_txt',
        pass_preferences: 'superignore-users',
        callback: function(stash, pathname, params, ignorelist_add_txt, super_ignore_users) {
            $('#submit_save')
                .parent().prepend('<div style="float: left; position: static; margin-top: 4px" class="toplinks"><input type="checkbox" id="super-ignore"><label for="super-ignore" style="vertical-align: top"> Hide ignored messages completely (&ldquo;super-ignore&rdquo;)</label></div>')
                .closest('form').submit(function() {
                    BabelExt.preferences.set( 'superignore-users', $('#super-ignore').is(':checked') );
                });
            $('#super-ignore').prop('checked', super_ignore_users);
        }
    },

    /*
     * USER CONTROL PAGE
     */
    {
        match_pathname: '/usercp.php',
        match_elements: '#usercp_navpopup',
        pass_storage: [ 'ignored-forums', 'ignorable-forum-list' ],
        callback: function(stash, pathname, params, usercp_navpopup, ignored_forums, ignorable_forum_list ) {

            $(
                '<div class="block">' +
                    '<h2 class="blockhead">Ignored Forums</h2>' +
                    '<ol id="ignored_forumlist" class="blockbody settings_form_border"></ol>' +
                '</div>' +
                '<div class="clear"></div>'
            ).insertBefore(usercp_navpopup);

            if ( ( ignored_forums || '' ).length < 2 ) {
                $('#ignored_forumlist').append(
                    '<li class="forumbit_post old L2">' +
                        '<div class="forumrow table">' +
                            '<div class="foruminfo td"><strong>To ignore a forum, go to the forum page and click <em>Forum Tools</em> &gt; <em>Ignore</em></strong></div>' +
                        '</div>' +
                    '</li>'
                );
            } else {
                ignorable_forum_list = JSON.parse(ignorable_forum_list);
                $('#ignored_forumlist').append(
                    Object.keys(ignorable_forum_list).map(function(forum_id) {
                        var forum_name = ignorable_forum_list[forum_id];
                        if ( ignored_forums.search( ' ' + forum_id + ' ' ) == -1 )
                            return '';
                        else
                            return (
                                '<li class="forumbit_post old L2">' +
                                    '<div class="forumrow table">' +
                                        '<div class="foruminfo td">' +
                                            '<img alt="" id="forum_statusicon_' + encodeURIComponent(forum_id) + '" class="forumicon" src="images.frontier/statusicon/forum_old-48.png">' +
                                            '<div class="forumdata"><div class="datacontainer">' +
                                                    '<div class="titleline">' +
                                                        '<h2 class="forumtitle"><a href="forumdisplay.php?f='+encodeURIComponent(forum_id)+'">'+BabelExt.utils.escapeHTML(forum_name)+'</a></h2>' +
                                                    '</div>' +
                                            '</div></div>' +
                                    '</div>' +
                                '</li>'
                            );
                    })
                    .join('')
                );
            }

        }
    }
);


/*
 * CREATE THREAD PAGE
 */
BabelExt.utils.dispatch(
    {
        match_pathname: '/newthread.php',
        match_elements: '#subject',
        callback: function(stash, pathname, params, subject) {
            $('<input type="button" value="Search!" class="button" style="margin:2px 1em">')
                .insertAfter(subject)
                .click(function() {
                    disable_page_exit_confirmation()
                    document.location = '/search.php?do=process&childforums=1&exactname=1&quicksearch=1&showposts=1&query=' + encodeURIComponent($(subject).val());
                });
        }
    },
    {
        match_pathname: '/newthread.php',
        match_elements: '.blockrow.texteditor',
        callback: function(stash, pathname, params, editor) {
            /*
             * Super-simple thread suggester:
             * grabs all links from specified posts, suggests posts with matching terms
             *
             */

            var source_links = [
                // To add a new link, add the URL here and the specific posts below
                $('<li><a href="/showthread.php?t=20322">FAQ</a>'),
                $('<li><a href="/showthread.php?t=18606">Common topics</a>'),
                $('<li><a href="/search.php?do=getdaily">Recent posts</a>')
            ];

            var alternatives = $(
                '<div class="blockrow">' +
                    '<label class="full">Alternatives</label>' +
                    '<ul id="suggestions"><li></ul>' +
                '</div>'
            ).insertBefore(editor);
            $('#suggestions').append(source_links);

            $.when.apply( $, source_links.map(function(link) { return $.get($('a',link).attr('href')) }) ).done(function() {
                var terms = {};
                var links = [];

                for ( var n=0; n!=arguments.length; ++n )
                    $(arguments[n][0]).find(
                        '#post_message_454458 a,' + // FAQ
                        '#post_message_431402 a,' + // Common topics 1
                        '#post_message_431405 a,' + // Common topics 2
                        '#post_message_431507 a,' + // Common topics 3
                        '.threadtitle a'            // recent topics
                    ).each(function() {
                        var data = { score: 0, element: $('<li>').append(this) };
                        links.push(data);
                        this.textContent.toLowerCase().replace( /[^\w\s]|_/g, '' ).split( /\s+/ ).forEach(function(word) {
                            if ( terms.hasOwnProperty(word) )
                                terms[word].push(data);
                            else
                                terms[word] = [ data ];
                        });
                    });

                var stopwords = {};
                [ '',
                  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
                  'about', 'all', 'an', 'and', 'are', 'beta', 'between', 'dangerous', 'discussion', 'ed', 'elite', 'for', 'guide', 'in', 'it', 'of', 'on', 'or', 'the', 'thread', 'to', 'too', 'will', 'with', 'you', 'your'
                ].forEach(function(word) {
                    delete terms[word]; // remove stopwords from loaded pages
                    stopwords[word] = 1; // store stopwords to remove from input
                });

                $('#subject').on( 'input', function() {
                    // populate the list of possibly-related links:
                    links.forEach(function(link) { link.score = 0 });
                    $(this).val().toLowerCase().replace( /[^\w\s]|_/g, '' ).split( /\s+/ ).forEach(function(word) {
                        if ( stopwords.hasOwnProperty(word) ) return;
                        Object.keys(terms).forEach(function(term) {
                            if ( term.search(word) + word.search(term) != -2 ) {
                                var score =
                                    ( term   ==   word       ) ? 10 : // exact match
                                    ( term.search(word) > -1 ) ?  5 : // substring of a known term
                                    1                                 // known term is a substring
                                    ;
                                terms[term].forEach(function(data) { data.score += score });
                            }
                        })
                    });
                    $('#suggestions').empty().append(
                        links
                            .filter(function(link) { return link.score; })
                            .sort  (function(a, b) { return b.score - a.score; })
                            .map   (function(link) { return link.element })
                            .concat(source_links)
                            .splice(0,5)
                    );
                })
                    .trigger('input');
            });

        }
    }
);

/*
 * REPLY PAGE
 */
BabelExt.utils.dispatch(
    { // Thread alternatives
        match_pathname: '/newreply.php',
        match_elements: ['.blockrow.texteditor','#vB_Editor_001_editor','input[name="t"]'],
        callback: function(stash, pathname, params, editor, textarea, thread_input ) {

            // "Alternatives" box:
            var users      = {},
                user_count = 1,
                username   = params.username,
                user_id    = params.u,
                text       = '';
            ;
            if ( user_id && username ) {
                users[ username ] = 1;
                username = BabelExt.utils.escapeHTML(username);
                user_id = encodeURIComponent(user_id);
                text +=
                    '<tr><td style="font-weight: bold">' + username +
                    '<td><a title="notify the moderators about an unhelpful post" href="/report.php?p=' + BabelExt.utils.escapeHTML(params.p) + '">report ' + username + '</a>' +
                    '<td><a title="send a private message" href="/private.php?do=newpm&u=' + user_id + '">talk privately to ' + username + '</a>' +
                    '<td><a title="de-emphasise this person\'s messages" href="/profile.php?do=addlist&userlist=ignore&u=' + user_id + '">ignore ' + username + '</a>' +
                    '</tr>';
            }

            $(textarea).val().replace( /\[quote=([^;]{1,20})(?:;([0-9]*))?\]/gi, function( match, username, post_id ) {
                if ( !users.hasOwnProperty(username) ) {
                    users[username] = 1;
                    var unescaped_username = username;
                    username = BabelExt.utils.escapeHTML(username);
                    if ( post_id ) post_id = encodeURIComponent(post_id);
                    (function(request_id, username) {
                        // we create a closure so the variables stay the same when the AJAX request returns
                        text +=
                            '<tr><td style="font-weight: bold">' + username +
                            (
                                post_id
                                ? '<td><a title="notify the moderators about an unhelpful post" href="/report.php?p=' + post_id + '">report ' + username + '</a>'
                                : '<td style="color: grey" title="you can only report a specific post">report ' + username + ''
                            ) +
                            '<td id="pm_for_' + request_id + '" title="retrieving user ID...">talk privately to ' + username + '' +
                            '<td id="ig_for_' + request_id + '" title="retrieving user ID...">ignore ' + username + '' +
                            '</tr>';

                        $.ajax({
                            type: "POST",
                            url: '/ajax.php',
                            data: {
                                'do'           : 'usersearch',
                                'fragment'     : unescaped_username,
                                'securitytoken': $('input[name="securitytoken"]').val()
                            },
                            dataType: 'xml',
                            success: function(data) {
                                if ( $(data).find( 'user' ).first().text() == username ) {
                                    var user_id = encodeURIComponent( $(data).find( 'user' ).attr( 'userid' ) );
                                    $('#pm_for_'+request_id)
                                        .html( '<a title="send a private message" href="/private.php?do=newpm&u=' + user_id + '">talk privately to ' + username + '</a>' )
                                        .removeAttr( 'title' );
                                    $('#ig_for_'+request_id)
                                        .html( '<a title="emphasise this person\'s messages" href="/profile.php?do=addlist&userlist=ignore&u=' + user_id + '">ignore ' + username + '</a>' )
                                        .removeAttr( 'title' );
                                } else
                                    $('#pm_for'+request_id+',#ig_for_'+request_id).parent().remove();
                            },
                            error: function(foo, bar, err) {
                                $( '#pm_for_' + request_id ).parent().remove();
                            }
                        });

                    })(user_count++, username);
                }
            });

            $("head").append("<style type='text/css'>.alternatives td { padding: 0 1em }</style>");

            $(
                '<div class="blockrow alternatives">' +
                    '<label class="full">Alternatives</label>' +
                    '<table style="text-align: center">' +
                        text +
                        '<tr><td style="font-weight: bold">Thread' +
                        '<td><a title="Remove this thread from your subscription and user pages" href="/subscription.php?do=removesubscription&t=' + $(thread_input).val() + '">unsubscribe</a>' +
                        '<td style="color: grey; font-weight: bold" title="make your reply visible to everyone in the thread">broadcast message' +
                        '<td><a title="unsubscribe and de-emphasise this thread in listings" href="/subscription.php?do=removesubscription&t=' + $(thread_input).val() + '&ignore=1">ignore</a>' +
                        '</tr>' +
                        '<tr><td colspan="5" style="font-style: italic">&hellip; or why don\'t you just switch off your browser and go blast some Thargoids instead?</tr>' +
                    '</table>' +
                '</div>'
            ).insertBefore(editor);

        }
    }
);

/**
 * Upgrades for "editor" pages (create thread, new reply)
 */

BabelExt.utils.dispatch(
    { // "Caution" box
        match_elements: [ '#subject,#title', '#cke_contents_vB_Editor_001_editor', '#vB_Editor_001_save' ],
        callback: function(stash, pathname, params, subject, editor, save) {

            var subject_reason = '', editor_reason = '';

            $('#subject,#title').on( 'input', function() {
                // warn about dodgy subjects:
                var text = $(this).val();
                if ( text.search( /\b(cmdr|commander)\b/i ) != -1 )
                    subject_reason = "Make sure your message can't be seen as naming and shaming (which will receive moderator action)";
                else if ( text.search( /\bquestions?\b/i ) != -1 )
                    subject_reason = "Ask a specific question to improve your chance of getting an answer";
                else
                    subject_reason = '';
            });

            $('#cke_contents_vB_Editor_001_editor').on( 'input', function() {
                BabelExt.utils.runInEmbeddedPage( 'document.getElementById("cke_contents_vB_Editor_001_editor").setAttribute( "data-contents", vB_Editor["vB_Editor_001"].get_editor_contents() )');
                var text = this.getAttribute('data-contents');
                if ( ( text.match(   /\[quote/gi   ) || [] ).length !=
                     ( text.match( /\[\/quote\]/gi ) || [] ).length
                   )
                    editor_reason = "Make sure to match every [quote] and [/quote]";
                else if ( text.length < 5 )
                    editor_reason = 'Please add some text'
                else if ( text.length > 15000 ) // maximum length at the time of writing
                    editor_reason = 'Your message is quiet long (' + text.length + ' characters)'
                else
                    editor_reason = '';
            });

            function watch_wysiwyg_changes() {
                setTimeout(function() {
                    var iframe = document.getElementById('vB_Editor_001_iframe');
                    if ( iframe ) {
                        $( 'body', iframe.contentDocument ).on( 'input', function() {
                            $('#cke_contents_vB_Editor_001_editor').trigger('input');
                        });
                        $('#cke_contents_vB_Editor_001_editor').trigger('input');
                    }
                }, 1000 );
            };
            watch_wysiwyg_changes();
            $('.cke_button_enhancedsource').click(watch_wysiwyg_changes);

            $('#subject,#title,#cke_contents_vB_Editor_001_editor').on( 'input', function() {
                var reason = subject_reason || editor_reason;
                if ( !reason && (params['do']||'').search(/new|insert/) == 0 ) // new thread, new reply
                    reason = 'Preview your post to make sure it reads well';

                $('#caution-box').remove();
                if ( reason ) {
                    $(save).css({ 'font-size': 'xx-small' })
                        .next().css({ 'font-weight': 'bold' })
                        .prev().before('<div id="caution-box" class="button" style="display: inline-block; border: none; background: none; cursor: default"><img style="margin: 0 3px -3px 0" src="images/icons/vbposticons/icon4.gif">' + reason + '</div> ');
                } else {
                    $(save).css({ 'font-size'  : '' })
                    .next().css({ 'font-weight': '' });
                }
            })
                .trigger('input');

        }

    }
);

BabelExt.utils.dispatch(
    { // URL to vB Code button
        match_elements: [ '.cke_toolbar_end' ],
        callback: function(stash, pathname, params, last_button) {

            var unlink_button = $(
                '<span id="links-to-vbcode" class="cke_button"><a onfocus="return CKEDITOR.tools.callFunction(115, event);" onkeydown="return CKEDITOR.tools.callFunction(114, event);" onblur="this.style.cssText = this.style.cssText;" role="button" hidefocus="true" tabindex="-1" title="Convert Links to vB code" class="cke_off cke_button_Convert" id="cke_link_convert"><span style="background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAAQAQMAAADK/wYcAAAABlBMVEUAAAAAAAClZ7nPAAAAAXRSTlMAQObYZgAAAAFiS0dEAIgFHUgAAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQfeChMKMzOq0LbfAAAAGXRFWHRDb21tZW50AENyZWF0ZWQgd2l0aCBHSU1QV4EOFwAAACtJREFUCNdj+CPfwADCBxgh+JBiA8MRwQaGE5wNDBdYITSIDxKHqQFhqD4AyboWGYnyavIAAAAASUVORK5CYII=);background-position:0 0px;" class="cke_icon">&nbsp;</span><span class="cke_label" id="cke_link_convert_label">Convert Links to vB code</span></a></span>'
            ).insertAfter($('.cke_top .cke_button').last());

            BabelExt.utils.runInEmbeddedPage( 'document.getElementById("links-to-vbcode").addEventListener("click", function() { this.setAttribute( "data-contents", vB_Editor["vB_Editor_001"].get_editor_contents() ); })');
            unlink_button
                .click(function() {

                    var start_quote = '\\[quote(?:=[^];\\n]{1,20}(?:;[0-9]*)?)?\\]',
                        end_quote = '\\[\\/quote\\]',
                        quote_block = new RegExp( start_quote + '(?:[^[]|(?!'+start_quote+'|'+end_quote+')\\[)*' + end_quote, 'g' ),
                        quotes      = [];
                        ;

                    var contents = this.getAttribute( 'data-contents' );

                    // extract quote blocks (including nested quote blocks) so they're not altered:
                    while ( contents.search(quote_block) != -1 )
                        contents = contents.replace(
                            quote_block,
                            function(quote) {
                                quotes.push(quote);
                                return '[extracted_quoted_block_id=' + (quotes.length-1) + ']';
                            }
                        );

                    var url_re = '(?:(?:https?:\\/\\/)?' + location.hostname.replace( /\./g, '\\.' ) + '\\/?|\\/?)?\\/showthread\\.php\\?(?:[^\\s()<>]+&)?([pt])=([0-9]+)[^\\s()<>\\[\\]]*?';

                    function replace_url( match, type, id, text ) {
                        if ( arguments.length == 5 )
                            return (
                                ( type == 'p' )
                                    ? "[post="  +id+"]post #"  +id+"[/post]"
                                    : "[thread="+id+"]thread #"+id+"[/thread]"
                            );
                        else
                            return (
                                ( type == 'p' )
                                    ? "[post="  +id+"]"+text+"[/post]"
                                    : "[thread="+id+"]"+text+"[/thread]"
                            );
                    }

                    contents = contents // fix post links:
                        .replace( new RegExp(    '\\[URL="?'   + url_re + '"?\\](.*?)\\[\\/URL\\]'  , 'gi' ), replace_url )
                        .replace( new RegExp(    '\\[URL="?'   + url_re + '"?\\]'                   , 'gi' ), replace_url )
                        .replace( new RegExp( '(?:\\[URL\\]|)' + url_re +        '(?:\\[\\/URL\\]|)', 'gi' ), replace_url )
                    ;

                    // put quote blocks back in:
                    while ( contents.search( /\[extracted_quoted_block_id=([0-9]+)\]/ ) != -1 )
                        contents = contents.replace(
                                /\[extracted_quoted_block_id=([0-9]+)\]/,
                            function(text,n) { return quotes[n] }
                        );
                    ;

                    if ( $('#vB_Editor_001_textarea').is(':visible') )
                        $('#vB_Editor_001_textarea').val( contents );
                    else
                        BabelExt.utils.runInEmbeddedPage("vB_Editor['vB_Editor_001'].write_editor_contents(" + JSON.stringify(contents) + ")");
                });
            ;
        }
    }
);

BabelExt.utils.dispatch(
    { // Initialise the "save to drafts" box:
        match_elements: '#vB_Editor_001_save',
        callback: function(stash, pathname, params, save) {

            $('<input id="save-to-drafts" class="button" type="button" tabindex="1" accesskey="d" value="Save to Drafts" name="draft">').appendTo( $(save).parent() );
            BabelExt.utils.runInEmbeddedPage( 'document.getElementById("save-to-drafts").addEventListener("click", function() { this.setAttribute( "data-contents", vB_Editor["vB_Editor_001"].get_editor_contents() ); })');
            $('#save-to-drafts').on( 'click', function() {
                var title = $('#subject,#title').val(),
                    body = $(this).data('contents')
                ;
                BabelExt.storage.get( 'drafts', function(drafts) {
                    drafts = drafts.value;
                    if ( drafts ) drafts += '\n';
                    else          drafts = '';
                    drafts += JSON.stringify({ 'title': title, 'body': body, 'heading': title || 'Draft saved at ' + new Date().toString() });
                    BabelExt.storage.set( 'drafts', drafts, function() {
                        var thread_id = $('input[name="t"]').val();
                        disable_page_exit_confirmation()
                        document.location = (
                            thread_id // thread-related page
                                ? '/showthread.php?t=' + thread_id + '&goto=newpost'
                                : '/search.php?do=getdaily'
                        );
                    });
                });
            });
        }
    },

    { // draft messages
        match_elements: '#rating,#subscribe_deps,#cb_signature',
        pass_storage: 'drafts',
        callback: function(stash, pathname, params, additional_options, drafts) {

            var drafts_div = $(
                '<fieldset class="blockrow">' +
                    '<legend>Drafts</legend>' +
                    '<label>Drafts</label>' +
                    '<ul class="description"></ul>' +
                '</fieldset>'
            )
                .appendTo( $(additional_options).closest('.section') )
                .find('.description')
            ;

            if ( drafts ) {

                drafts_div.append(
                    drafts.split("\n").map(function(draft) {
                        var unpacked_value = JSON.parse(draft);
                        var div = $('<li><a href="#restore-draft"></a> - <a href="#delete">(delete)</a></li>')
                            .data( 'value'   , draft )
                            .data( 'unpacked', unpacked_value );
                        div.find('a').first().text(unpacked_value['heading']);
                        return div;
                    })
                );

                drafts_div
                    .on( 'click', 'a[href="#delete"],a[href="#undelete"]', function(event) {
                        if ( $(this).parent().hasClass('deleted') ) {
                            $(this).parent().removeClass('deleted');
                            $(this).attr( 'href', '#delete' ).text( '(delete)' );
                        } else {
                            $(this).parent().addClass('deleted');
                            $(this).attr( 'href', '#undelete' ).text( '(undelete)' );
                        }
                        BabelExt.storage.set( 'drafts', drafts_div.find('li').not('.deleted').map(function() { return $(this).data('value'); }).get().join("\n") );
                        event.preventDefault();

                    })
                    .on( 'click', 'a[href="#restore-draft"]', function(event) {
                        var value = $(this).parent().data( 'unpacked' );
                        $('#subject,#title').val( value.title )[0].scrollIntoView();
                        BabelExt.utils.runInEmbeddedPage("vB_Editor['vB_Editor_001'].write_editor_contents(" + JSON.stringify(value.body) + ")");
                        event.preventDefault();
                    });

            } else {

                drafts_div.html('<li>Click the "Save to Drafts" button to save draft messages');

            }
        }

    }

);

})();
