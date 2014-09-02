var dispatch_handlers = (function() {

    /*
     * UTILTIES
     */

    /**
     * Set a selection of variables
     *
     * @param {Object} vars variables to set
     * @param {function} callback function to call when all variables have been retrieved
     */
    function set_variables(to_set, callback) {
        var count = 0;
        for ( var variable in to_set ) if ( to_set.hasOwnProperty(variable) ) {
            ++count;
            BabelExt.storage.set(variable, to_set[variable], function() {
                if ( callback && !--count ) callback.call(document);
            });
        };
    }

    /**
     * Get a selection of variables
     * @param {...(string)} vars variables to get (will become arguments to the callback)
     * @param {function} callback function to call when all variables have been retrieved
     */
    function get_variables() {
        var to_get = Array.prototype.slice.call( arguments, 0 ), callback = to_get.pop(), args = [];
        function get(data) {
            args.push(data.value);
            if ( to_get.length )
                BabelExt.storage.get(to_get.shift(), get );
            else
                callback.apply( document, args );
        }
        BabelExt.storage.get(to_get.shift(), get );
    }

    var caution_reason;
    /**
     * Show or hide the "caution" message on post pages
     *
     * Set or clear the "caution_reason" variable before calling this.
     * Note: when using this on a page without a '#vB_Editor_001_save' element,
     * make sure to set 'caution-submit-button' on the submit button
     *
     */
    function apply_caution() {
        $('#caution-box').remove();
        if ( caution_reason ) {
            $('#vB_Editor_001_save,.caution-submit-button').css({ 'font-size': 'xx-small' })
                .next().css({ 'font-weight': 'bold' })
                .prev().before('<div id="caution-box" style="margin: 2px 0 4px"><span style="border: 1px solid black; padding: 3px; display: inline-block; padding: 5px; background: #dda"><img style="margin: 0 3px -3px 0" src="images/icons/vbposticons/icon4.gif">' + caution_reason + '</span></div>');
        } else {
            $('#vB_Editor_001_save,.caution-submit-button').css({ 'font-size': '' })
                .next().css({ 'font-weight': '' });
        }
    }

    /**
     * Observe the creation of an element, then immediately remove the observer
     * @param {string}   query    selector to observe
     * @param {function] callback function to call on element creation
     */
    function observe_once( query, callback ) {
        var times_called = 0, found_elements = $(query);
        function observer(record) {
            $(document).disconnect('added', query, observer );
            if ( !times_called++ )
                return callback.call( this, record );
        }
        if ( found_elements.length )
            callback.call( found_elements[0] );
        else
            $(document).observe('added', query, observer );
    }

    /**
     * Hide ignored threads and add the checkbox
     * to listing pages (new posts, forum and subscription)
     */
    function ignore_threads(has_tfoot) {
        get_variables( 'super-ignore-threads', 'ignored-threads', function( do_super_ignore, ignored_threads ) {

            var ignored_thread_trs, ignored_thread_titles = '#doesnt-exist';

            if ( ignored_threads ) {
                var ignored_thread_titles = ignored_threads.split( ' ' );
                ignored_thread_titles.shift(); ignored_thread_titles.pop();
                for ( var n=0; n!=ignored_thread_titles.length; ++n ) ignored_thread_titles[n] = '#thread_title_' + ignored_thread_titles[n];
                ignored_thread_titles = ignored_thread_titles.join(',');
            }

            function do_ignore() {
                if ( do_super_ignore ) {
                    ignored_thread_trs.hide();
                } else {
                    ignored_thread_trs.show();
                }
            }

            observe_once( '.tfoot,#collapseobj_lowerbreadcrumbs', function() {
                ignored_thread_titles = $(ignored_thread_titles);
                ignored_thread_trs = ignored_thread_titles.closest('tr');
                ignored_thread_titles
                    .each(function() {
                        var text = $(this).text(),
                        tr = $(this).closest('tr');
                        tr.children().html('');
                        tr.children().eq(2)
                            .text( text )
                            .css({ 'font-size': 'smaller', 'color': 'grey', 'padding': '2px 6px' })
                            .removeAttr( 'title' );
                    })
                    .closest('tr');

                var tfoot;
                if ( $(this).hasClass( 'tfoot' ) ) {
                    tfoot = $(this);
                } else {
                    var list = $('#threadslist tbody[id^=threadbits_]'),
                        tds  = list.children('tr').last().children('td').length
                    ;
                    tfoot = $('<tr><td align="right" colspan="' + tds + '" class="tfoot"></tr>').appendTo(list).find('.tfoot');
                };
                do_ignore();

                tfoot.prepend('<label style="float: left; color: white"><input type="checkbox" id="super-ignore">Hide ignored threads completely (&ldquo;super-ignore&rdquo;)</label>');
                $('#super-ignore')
                    .change(function() {
                        set_variables({ 'super-ignore-threads': do_super_ignore = $('#super-ignore').is(':checked') }, do_ignore );
                    })
                    .prop('checked', do_super_ignore)
            });

        });
    }

    /**
     * Upgrades for "editor" pages (create thread, new reply)
     *
     */
    function upgrade_editor(query_params) {

        // Initialise the "Convert links to vB Code" button:
        observe_once( '#vB_Editor_001_cmd_unlink', function() {
            var unlink_button =
                $('<td><div id="links-to-vbcode" class="imagebutton" style="padding: 1px"><img width="21" height="20" alt="Remove Link" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAUAQMAAABYheRwAAAABlBMVEUAAAAAAAClZ7nPAAAAAXRSTlMAQObYZgAAAAFiS0dEAIgFHUgAAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQfeCBsTDhDO3GxjAAAAGXRFWHRDb21tZW50AENyZWF0ZWQgd2l0aCBHSU1QV4EOFwAAAC5JREFUCNdjYIACe/YHYGzAkADBHQkMhiwJDEZMCQwmjBAaxAeJw9UAMUwfFAAA8csMgM9Vo7AAAAAASUVORK5CYII=" title="Convert Links to vB code"></div></td>')
                .insertAfter( $(this).closest('td') )
                .find('div')
                .mouseover( function() { $(this).css({ 'background-color': 'rgb(193,210,238)', 'padding': 0, 'border': '1px solid rgb(49,106,197)' }); })
                .mouseout ( function() { $(this).css({ 'background-color': 'rgb(225, 225, 226)', 'padding': '1px', 'border': 'none' }); })
            ;
            inject_script( 'document.getElementById("links-to-vbcode").addEventListener("click", function() { this.setAttribute( "data-contents", vB_Editor["vB_Editor_001"].get_editor_contents() ); })');
            unlink_button
                .click(function() {
                    var contents = this.getAttribute( 'data-contents' ),
                        altered_contents = contents
                        // fix post links:
                        .replace( /\[URL="?(?:(?:https?:\/\/)?forums\.frontier\.co\.uk\/?|\/?)?\/show(?:thread|post)\.php\?(?:[^\s()<>]+&)?([pt])=([0-9]+)[^\s()<>]*?"?\](.*?)\[\/URL]/gi, function(match, type, id, text) {
                            return (
                                ( type == 'p' )
                                ? "[post="+id+"]"+text+"[/post]"
                                : "[thread="+id+"]"+text+"[/thread]"
                            );
                        })
                        .replace( /\[URL="?(?:(?:https?:\/\/)?forums\.frontier\.co\.uk\/?|\/?)?\/show(?:thread|post)\.php\?(?:[^\s()<>]+&)?([pt])=([0-9]+)[^\s()<>]*?"?\]/gi, function(match, type, id ) {
                            return (
                                ( type == 'p' )
                                ? "[post="+id+"]"
                                : "[thread="+id+"]"
                            );
                        })
                        .replace( /(?:\[URL\]|)(?:(?:https?:\/\/)?forums\.frontier\.co\.uk\/?|\/?)?\/show(?:thread|post)\.php\?(?:[^\s()<>]+&)?([pt])=([0-9]+)[^\s()<>]*(\[\/URL\]|)/gi, function(match, type, id ) {
                            return (
                                ( type == 'p' )
                                ? "[post="+id+"]post #"+id+"[/post]"
                                : "[thread="+id+"]thread #"+id+"[/thread]"
                            );
                        })
                    ;
                    if ( $('#vB_Editor_001_textarea').is(':visible') )
                        $('#vB_Editor_001_textarea').val( altered_contents );
                    else
                        inject_script("vB_Editor['vB_Editor_001'].set_editor_contents(" + JSON.stringify(altered_contents) + ")");
                });
            ;
        });

        observe_once( '#vB_Editor_001_save', function() {

            // Manage the "caution" box:
            $('#vB_Editor_001_textarea').parent().on( 'input', function() { // 'click' added for ease of unit testing
                var text =
                    $('#vB_Editor_001_textarea').is(':visible')
                    ? $('#vB_Editor_001_textarea').val()
                    : $( '.wysiwyg', document.getElementById('vB_Editor_001_iframe').contentDocument ).text()
                ;
                if ( text.search( /\*{3}/ ) != -1 )
                    caution_reason = "Masked swearing will receive moderator action - rephrase the sentence so as not to put the thought in your readers' heads";
                else if ( ( text.match( /\[quote/gi   ) || [] ).length !=
                          ( text.match( /\[\/quote\]/gi ) || [] ).length
                        )
                    caution_reason = "Make sure to match every [quote] and [/quote]";
                else if ( (query_params['do']||'').search('new') == 0 ) // new thread, new reply
                    caution_reason = 'Preview your post to make sure it reads well';
                apply_caution();
            })
                .trigger( 'input' );

            function watch_wysiwyg_changes() {
                setTimeout(function() {
                    var iframe = document.getElementById('vB_Editor_001_iframe');
                    if ( iframe ) {
                        $( '.wysiwyg', iframe.contentDocument ).on( 'input', function() {
                            $('#vB_Editor_001_textarea').trigger('input');
                        });
                        $('#vB_Editor_001_textarea').trigger('input');
                    }
                }, 1000 );
            };
            watch_wysiwyg_changes();
            $('#vB_Editor_001_cmd_switchmode').click(watch_wysiwyg_changes);

            // Initialise the "save to drafts" box:
            $('<input id="save-to-drafts" class="button" type="button" tabindex="1" accesskey="d" value="Save to Drafts" name="draft">').appendTo( $(this).parent() );
            inject_script( 'document.getElementById("save-to-drafts").addEventListener("click", function() { this.setAttribute( "data-contents", vB_Editor["vB_Editor_001"].get_editor_contents() ); this.setAttribute( "data-type", vB_Editor["vB_Editor_001"].parsetype ); })');
            $('#save-to-drafts').on( 'click', function() {
                var title = $('[name=title]').val(),
                    body = $(this).data('contents'),
                    wysiwyg_body = body,
                    to_wysiwyg = $('#vB_Editor_001_textarea').is(':visible') ? 1 : 0
                ;
                $.ajax({
                    type: "POST",
                    url: 'http://forums.frontier.co.uk/ajax.php',
                    data: {
                        'do'           : 'editorswitch',
                        'allowsmilie'  : 1,
                        'parsetype'    : $(this).data('type'),
                        'securitytoken': $('input[name="securitytoken"]').val(),
                        'towysiwyg'    : to_wysiwyg,
                        'message'      : body
                    },
                    dataType: to_wysiwyg ? 'xml' : 'text',
                    success: function(data) {
                        if ( to_wysiwyg )
                            wysiwyg_body = $('message', data).text();
                        else
                            body = data;

                        get_variables( 'drafts', function(drafts) {
                            if ( drafts ) drafts += '\n';
                            else          drafts = '';
                            drafts += JSON.stringify({ 'title': title, 'body': body, 'wysiwyg_body': wysiwyg_body, 'heading': title || 'Draft saved at ' + new Date().toString() });
                            set_variables({ drafts: drafts }, function() {
                                var thread_id = $('a[href^="showthread.php?t="]').attr('href');
                                if ( thread_id ) // reply page
                                    document.location = '/showthread.php?t=' + thread_id.replace( /.*\?t=([0-9]*).*/, "$1" ) + '&goto=newpost';
                                else
                                    document.location = 'http://forums.frontier.co.uk/search.php?do=getdaily'
                            });
                        });
                    }
                });
            });

        });

        // Draft messages:
        observe_once('#cb_openclose', function() {
            var drafts_fieldset = $(this).closest('fieldset').clone().insertAfter($(this).closest('fieldset')),
                drafts_div = drafts_fieldset.children('div');
                drafts_fieldset.find('legend').text( 'Drafts' );
                drafts_div.html('');

            get_variables( 'drafts', function(drafts) {
                if ( drafts ) {

                    drafts = drafts.split("\n");

                    for ( var n=0; n!=drafts.length; ++n ) {
                        var div = $('<div><a href="#restore-draft"></a> - <a href="#delete">(delete)</a></div>').appendTo(drafts_div), unpacked_value = JSON.parse(drafts[n]);
                        div.data( 'value', drafts[n] );
                        div.data( 'unpacked', unpacked_value );
                        div.find('a').first().text(unpacked_value['heading']);
                    }

                    drafts_div
                        .on( 'click', 'a[href="#delete"],a[href="#undelete"]', function(event) {
                            if ( $(this).parent().hasClass('deleted') ) {
                                $(this).parent().removeClass('deleted');
                                $(this).attr( 'href', '#delete' ).text( '(delete)' );
                            } else {
                                $(this).parent().addClass('deleted');
                                $(this).attr( 'href', '#undelete' ).text( '(undelete)' );
                            }
                            set_variables({ drafts: drafts_div.find('div').not('.deleted').map(function() { return $(this).data('value'); }).get().join("\n") });
                            event.preventDefault();

                        })
                        .on( 'click', 'a[href="#restore-draft"]', function(event) {
                            var value = $(this).parent().data( 'unpacked' );
                            $('[name=title]').val( value['title'] )[0].scrollIntoView();
                            if ( $('#vB_Editor_001_textarea').is(':visible') )
                                $('#vB_Editor_001_textarea').val( value['body'] );
                            else
                                inject_script("vB_Editor['vB_Editor_001'].set_editor_contents(" + JSON.stringify(value['wysiwyg_body']) + ")");
                            event.preventDefault();
                        });

                } else {
                    drafts_div.text('Click the "Save to Drafts" button to save draft messages');
                }
            });

        });

    }



    var entityMap = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': '&quot;',
        "'": '&#39;',
        "/": '&#x2F;'
    };
    /**
     * Escape HTML characters in a string
     * @param {string} text text to escape
     * @return {string}
     */
    function escape_html(text) {
        return String(text).replace(/[&<>"'\/]/g, function (c) {
            return entityMap[c];
        });
    }

    /** For security reasons, some scripts need to be run in the context of the embedded page
     *
     */
    function inject_script(content) {
        var script = document.createElement('script');
        script.textContent = '(function() {' + content + '})();';
        document.documentElement.appendChild(script);
    }

    return {

        /*
         * ALL PAGES
         */
        '': function() {
            // Reset cookies when marking forums read (otherwise the cookie will fill up and break):
            $(document).on( 'click', 'a[href^="forumdisplay.php?do=markread"]', function() {
                document.cookie='bbthread_lastview=';
            });

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
            inject_script(
                '    window.real_confirm = window.confirm;' +
                '    window.confirm = function(message) {' +
                '        if ( message.search("You have a new private message.\\n\\n") == 0 ) {' +
                '            if ( window.real_confirm(message) ) {' +
                '                var scripts = document.body.getElementsByTagName(\'script\');' +
                '                for ( var n=scripts.length-1; n>=0; --n ) {' +
                '                    var match = scripts[n].textContent.match( \'window.location = \"([^\"]*)\' );' +
                '                    if ( match ) {' +
                '                        setTimeout(function() { window.location = match[1]; }, 0 );' +
                '                        return false;' +
                '                    }' +
                '                }' +
                '                return true;' +
                '            }' +
                '            return false;' +
                '        } else {' +
                '            return window.real_confirm( message );' +
                '        }' +
                '    }'
            );
        },


        /*
         * FORUM DISPLAY PAGE
         */

        forumdisplay: function() {
            // permalink:
            observe_once( '#community', function() {
                $('.navbar').first().parent().append( '&gt; <a href="' + location + '" title="permalink to this forum">[share]</a>' );
            });
            ignore_threads();
        },


        /*
         * SEARCH PAGE
         */
        search: function() {

            // permalink:
            observe_once( '#inlinemodform', function() {
                var query = ( $('a[href^="search.php"]', this).attr( 'href' ) || '?' ).split('?')[1].split('&'),
                    defaults = {
                        'exactname=0': 1,
                        'starteronly=0': 1,
                        'forumchoice[]=0': 1,
                        'prefixchoice[]=': 1,
                        'childforums=0': 1,
                        'titleonly=0': 1,
                        'showposts=0': 1,
                        'searchdate=0': 1,
                        'beforeafter=after': 1,
                        'sortorder=descending': 1,
                        'replyless=0': 1,
                        'replylimit=0': 1,
                        'searchthreadid=0': 1,
                        'saveprefs=0': 1, // never put saveprefs in the permalink
                        'saveprefs=1': 1,
                        'quicksearch=0': 1,
                        'searchtype=0': 1,
                        'nocache=0': 1,
                        'ajax=0': 1,
                        'userid=0': 1,
                        '': 1
                    },
                    exact_name_position = 0,
                    exact_name_value = ''
                ;

                if ( query.length == 1 && query[0] == '' ) {
                    if ( $('#inlinemodform a[href^="search.php"]').next().text().search( 'New Posts' ) == -1 ) {
                        query = [ 'do=getdaily' ];
                    } else {
                        query = [ 'do=getnew' ];
                    }
                    ignore_threads();
                } else {
                    for ( var n=0; n!=query.length; ++n ) {
                        if ( query[n].search( /^(userid=[^0]|searchuser=)/ ) == 0  ) {
                            exact_name_position = n+1;
                        } else if ( query[n] == 'exactname=1' ) {
                            exact_name_value = query[n];
                            query.splice( n--, 1 );
                        } else if ( defaults.hasOwnProperty(query[n]) || query[n].search( /^humanverify\[\]=/ ) == 0 ) {
                            query.splice( n--, 1 );
                        } else if ( query[n].search( /^query=/ ) == 0  ) {
                            var search_term = query[n].substr(6);
                            observe_once('.tfoot', function() {
                                $(this).prepend( '<span style="float: left">Didn\'t find what you were looking for?  <a style="color: black; text-decoration: underline" href="https://www.google.com/search?q=site:forums.frontier.co.uk+' + search_term + '">search with Google</a></div>' );
                            });
                        }
                    }
                    // we make sure 'exact_name' goes next to the name we're searching for, so it's clearer what it does:
                    if ( exact_name_position && exact_name_value )
                        query.splice( exact_name_position, 0, exact_name_value );
                    query.unshift( 'do=process' );
                }

                if ( typeof(history) !== 'undefined' && history.replaceState )
                    history.replaceState("","", '/search.php?' + query.join('&'));
                $('.navbar').first().parent().append( '&gt; <a href="' + '/search.php?' + query.join('&') + '" title="permalink to this search">[share]</a>' );

            });

            // Add the Google link to failed searches:
            observe_once('#searchform [name=query]', function() {
                $('.tcat').filter(function() { return $(this).text().substr( 'errors occurred' ) != -1; })
                    .closest('table').find('ol')
                    .after( '<a style="margin-left: 1em; color: black; text-decoration: underline" href="https://www.google.com/search?q=site:forums.frontier.co.uk+' + encodeURIComponent($(this).val()) + '">Search with Google</a></div>' );
            });

        },


        /*
         * SUBSCRIPTION PAGES
         */
        subscription: function(query_params) {

            // auto-unignore subscribed threads:
            if ( (query_params['do']||'') == 'addsubscription' ) query_params['ignore'] = 0;

            if ( query_params.hasOwnProperty('ignore') && query_params.hasOwnProperty('t') ) {
                get_variables('ignored-threads', function(ignored_threads) {
                    ignored_threads = ( ignored_threads || ' ' ).replace( ' ' + query_params['t'] + ' ', ' ' );
                    set_variables({
                        'ignored-threads':
                        ( query_params['ignore'] == '1' )
                        ? ignored_threads + query_params['t'] + ' '
                        : ignored_threads
                    });
                });
            }
        },


        /*
         * REMOVE SUBSCRIPTION PAGE
         */
        'subscription removesubscription': function(query_params) {

            if ( !query_params.hasOwnProperty('ignore') || query_params['ignore'] == '1' ) {
                // we use this page to remove the ignore feature to keep the UI consistent,
                // but actually we don't need to do anything else clever in that case

                // Going back to the page you just unsubscribed from only encourages you to get back into it.
                // Going to the "manage subscriptions" page makes thread super-ignore more findable
                setTimeout( function() { document.location = 'http://forums.frontier.co.uk/subscription.php?do=viewsubscription'; }, 2000 );
                // Stop the page content from redirecting:
                inject_script('window.setTimeout = function() {};');

            }

        },

        /*
         * VIEW SUBSCRIPTION PAGE
         */
        'subscription viewsubscription': ignore_threads,


        /*
         * SHOW THREAD PAGE
         */
        showthread: function() {
            observe_once( 'a[href^="showthread.php?t="]', function() {

                var thread_id = $('a[href^="showthread.php?t="]').attr('href').replace( /.*\?t=([0-9]*).*/, "$1" );

                // permalink:
                $('.navbar').first().parent().append( '&gt; <a href="showthread.php?t=' + thread_id + '" title="permalink to this thread">[share]</a>' );

                get_variables( 'super-ignore-users', 'ignored-threads', function(do_super_ignore, ignored_threads) {

                    // (un-)ignore thread link:
                    observe_once( '#displaymodes_menu', function() {
                        $('#threadtools_menu a[href^="subscription.php"]').last().closest('tr').after(
                            '<tr>' +
                            '<td id="subscribe-ignore" class="vbmenu_option vbmenu_option_alink" style="cursor: default;"><img alt="Subscription" src="skins/frontier/buttons/subscribe.gif" class="inlineimg" title="Subscription">' +
                            (
                                ( !ignored_threads || ignored_threads.search( ' ' + thread_id + ' ' ) == -1 )
                                ? '<a rel="nofollow" href="subscription.php?do=removesubscription&amp;t=' + thread_id + '&amp;ignore=1">Ignore this Thread</a>' // not ignored
                                : '<a rel="nofollow" href="subscription.php?do=removesubscription&amp;t=' + thread_id + '&amp;ignore=0">Unignore this Thread</a>' // ignored (and therefore not subscribed)
                            ) +
		            '</td>' +
	                    '</tr>'
                        );
                        $('#subscribe-ignore')
                            .mouseover(function() { this.className = 'vbmenu_hilite vbmenu_hilite_alink'; this.setAttribute( 'style', "cursor: pointer;" ); })
                            .mouseout (function() { this.className = 'vbmenu_option vbmenu_option_alink'; this.setAttribute( 'style', "cursor: default;" ); })
                    });

                    // per-post actions:
                    observe_once( '#lastpost', function() {
                        $('#posts .page').each(function() {
                            if ( $(this).has( '.smallfont a[href^="profile.php?userlist=ignore&do=removelist&u="]' ).length ) {
                                if ( do_super_ignore ) $(this).hide();
                            } else {
                                var pm = $(this).find( '.vbmenu_popup a[href^="private.php"]'),
                                    user_id = pm.attr('href').replace( /.*&u=/, '' ),
                                    name = pm.text().replace( /^Send a private message to /, '' ),
                                    // the "quote" link is the only one that appears in all display modes, both when logged in and logged out:
                                    reply_box = $(this).find('a[rel=nofollow]').has('img[src="skins/frontier/buttons/quote.gif"]').parent(),
                                    post_id = $(this).find('a').first().attr( 'href' ).split('?p=')[1].split('&')[0]
                                ;

                                // extra ignore options:
                                pm.closest('tr').clone().insertAfter(pm.closest('tr'))
                                    .children('td').html( '<a href="/profile.php?do=ignorelist&username=' + name + '">Ignore ' + name + '</a>' );

                                if ( reply_box ) {
                                    // permalink (TODO: find somewhere to put it in locked threads):
                                    reply_box.prepend( '<a style="float: left; margin-left: 1em; font-size: medium; margin-top: 4px" title="permalink to this post" href="/showthread.php?p=' + post_id + '#post' + post_id + '">[share]</a>' );
                                    if ( name ) {
                                        var parameters = '&u=' + user_id + '&username=' + encodeURIComponent(name);
                                        reply_box.find('a[href^="newreply.php"]').each(function() { this.href += parameters });
                                    }
                                }

                            }

                        });
                    });

                });

            });

            // Check user's signature (logged in users only)
            observe_once( 'a[href="private.php"]', function() { $(function() {

                var user_id   = $('a[href^="member.php?u="]').first().attr('href').substr(13),
                    user_name = $('a[href^="member.php?u="]').first().text(),
                    user_post = $('a.bigusername[href="member.php?u='+user_id+'"]')
                ;

                if ( user_post.length ) {

                    // TODO: merge this with the code on the signature page (below)
                    var body       = user_post.closest('tbody').find( 'div[id^=post_message_]'),
                        sig_block  = body.next().not('[align=right]').not('.smallfont').not('[style="padding:6px"]'),
                        sig_image  = sig_block.find( 'img' ).not('.inlineimg'),
                        sig_text   = '{' + sig_block.text()
                            .replace( /[\t\n ]*$/, '' )
                            .replace( /^[\t\n ]/, '' )
                            .replace( /\n\tQuote:[\t\n ]*/, "Quote:\n(extra line for quote block)\n" )
                            .replace( /(\n\(extra line for quote block\)\nOriginally Posted by .*\n)[\t\n ]*/, "$1" )
                            + '}',
                        line_count = sig_text.split( "\n" ).length - 1,
                        violations = ''
                    ;

                    if ( sig_image[0] ) {
                        if ( sig_image.length   > 1   ) violations += 'too many images: ' + sig_image.length + "\n";
                        if ( sig_image[0].width > 650 ) violations += 'sig too wide: ' + sig_image[0].width + 'x' + sig_image[0].height + 'px' + "\n";
                        if      ( sig_image[0].height > 150                   ) violations += 'sig too tall: ' + sig_image[0].width + 'x' + sig_image[0].height + "px\n"
                        if      ( sig_image[0].height > 120 && line_count > 2 ) violations += 'too many lines: ' + line_count + "\n"
                        else if ( sig_image[0].height >  90 && line_count > 3 ) violations += 'too many lines: ' + line_count + "\n"
                        else if (                              line_count > 4 ) violations += 'too many lines: ' + line_count + "\n"
                    } else {
                        if      (                              line_count > 5 ) violations += 'too many lines: ' + line_count + "\n"
                    };
                    if ( violations ) {
                        if (
                            confirm(
                                "Your signature seems to violate the forum rules, and will receive moderator action." +
                                    "Click OK to edit it or Cancel to continue"
                            )
                        )
                            setTimeout(function() { document.location = 'http://forums.frontier.co.uk/profile.php?do=editsignature'; }, 0 );
                    }

                }

            })});

        },


        /*
         * CREATE THREAD PAGE
         */
        newthread: function(query_params) {
            /*
             * Super-simple thread suggester:
             * grabs all links from specified posts, suggests posts with matching terms
             *
             */

            observe_once( '#tag_add_input', function() {

                var alternatives = $(this).closest('fieldset').clone();

                alternatives.find('legend').text( 'Alternatives' );
                alternatives.find('div').first().html(
                        '<ul id="suggestions"><li><a href="http://forums.frontier.co.uk/showthread.php?t=20322">FAQ</a><li><a href="http://forums.frontier.co.uk/showthread.php?t=18606">Common topics</a></ul>'
                );

                $('[name=subject]')
                    .parent().next().html('<input type="button" value="Search!">')
                    .find('input').click(function() {
                        document.location = 'http://forums.frontier.co.uk/search.php?do=process&childforums=1&exactname=1&quicksearch=1&showposts=1&query=' + encodeURIComponent($('[name=subject]').val());
                    })
                    .closest('table').after( alternatives );
                $.when(
                    $.ajax( "http://forums.frontier.co.uk/showpost.php?p=454458&postcount=1" ), // FAQ
                    $.ajax( "http://forums.frontier.co.uk/showpost.php?p=431402&postcount=1" ), // Common topics 1
                    $.ajax( "http://forums.frontier.co.uk/showpost.php?p=431405&postcount=2" ), // Common topics 2
                    $.ajax( "http://forums.frontier.co.uk/showpost.php?p=431507&postcount=3" ),  // common topics 3
                    $.ajax( "http://forums.frontier.co.uk/search.php?do=getdaily" )  // today's posts
                ).done(function() {
                    var terms = {};
                    for ( var n=0; n!=arguments.length; ++n ) {
                        $(arguments[n][0]).find('[id^="post_message_"] a,a[id^="thread_title_"]').each(function() {
                            var words = $(this).text().toLowerCase().replace( /[^\w\s]|_/g, '' ).split( /\s+/ ),
                            href = $(this).attr( 'href' ),
                            link = '<li><a href="' + escape_html(href) + '">' + escape_html($(this).text()) + '</a>'
                            ;
                            for ( var m=0; m!=words.length; ++m ) {
                                if ( terms.hasOwnProperty(words[m]) )
                                    terms[words[m]].push(link);
                                else
                                    terms[words[m]] = [ link ];
                            }
                        });
                    }

                    var stopwords = {
                        '': 1,
                        'a': 1,
                        'b': 1,
                        'c': 1,
                        'd': 1,
                        'e': 1,
                        'f': 1,
                        'g': 1,
                        'h': 1,
                        'i': 1,
                        'j': 1,
                        'k': 1,
                        'l': 1,
                        'm': 1,
                        'n': 1,
                        'o': 1,
                        'p': 1,
                        'q': 1,
                        'r': 1,
                        's': 1,
                        't': 1,
                        'u': 1,
                        'v': 1,
                        'w': 1,
                        'x': 1,
                        'y': 1,
                        'z': 1,
                        'about': 1,
                        'all': 1,
                        'an': 1,
                        'and': 1,
                        'are': 1,
                        'beta': 1,
                        'between': 1,
                        'dangerous': 1,
                        'discussion': 1,
                        'ed': 1,
                        'elite': 1,
                        'for': 1,
                        'guide': 1,
                        'in': 1,
                        'it': 1,
                        'of': 1,
                        'on': 1,
                        'or': 1,
                        'the': 1,
                        'thread': 1,
                        'to': 1,
                        'too': 1,
                        'will': 1,
                        'with': 1,
                        'you': 1,
                        'your': 1
                    };

                    // remove stopwords:
                    for ( var word in stopwords ) if ( stopwords.hasOwnProperty(word) ) delete terms[word];

                    $('[name=subject]').on( 'input', function() {
                        // warn about dodgy subjects:
                        var text = $(this).val();
                        caution_reason = '';
                        if ( text.search( /\b(cmdr|commander)\b/i ) != -1 )
                            caution_reason = "Make sure your message can't be seen as naming and shaming (which will receive moderator action)";
                        else if ( text.search( /\bquestions?\b/i ) != -1 )
                            caution_reason = "More people will read your thread if your topic asks a specific question";
                        else if ( (query_params['do']||'').search('new') == 0 ) // new thread, new reply
                            caution_reason = 'Preview your post to make sure it reads well';
                        apply_caution();

                        // populate the list of possibly-related links:
                        var words = text.toLowerCase().replace( /[^\w\s]|_/g, '' ).split( /\s+/ );
                        var matches = {};
                        for ( var n=0; n!=words.length; ++n ) if ( !stopwords.hasOwnProperty(words[n]) )
                            for ( var term in terms ) if ( terms.hasOwnProperty(term) )
                                if ( term.search(words[n]) + words[n].search(term) != -2 ) {
                                    var score =
                                        ( words[n] == term           ) ? 10 : // exact match
                                        ( term.search(words[n]) > -1 ) ? 5  : // substring of a known term
                                                                         1    // known term is a substring
                                    ;
                                    for ( var m=0; m!=terms[term].length; ++m )
                                        matches[terms[term][m]] = ( matches[terms[term][m]] || 0 ) + score;
                                }
                        var matches = Object.keys(matches).sort(function(a, b) { return matches[b] - matches[a]; });
                        matches.push(
                            '<li><a href="http://forums.frontier.co.uk/showthread.php?t=20322">FAQ</a>',
                            '<li><a href="http://forums.frontier.co.uk/showthread.php?t=18606">Common topics</a>'
                        );
                        $('#suggestions').html(matches.splice(0,5).join(''));
                    })
                        .trigger('input');
                });

            });

            upgrade_editor(query_params);

        },


        /*
         * REPLY PAGE
         */
        newreply: function(query_params) {
            // "Alternatives" box:
            observe_once( '#rb_iconid_0', function() {
                var user_actions = $(this).closest('fieldset').clone(),
                    users      = {},
                    user_count = 1,
                    username   = query_params['username'],
                    user_id    = query_params['u'],
                    text       = '<table style="margin:0 auto; text-align: center">'
                ;
                if ( user_id && username ) {
                    users[ username ] = 1;
                    text +=
                        '<tr><td style="font-weight: bold">' + username +
                        '<td><a title="notify the moderators about an unhelpful post" href="/report.php?p=' + escape_html(query_params['p']) + '">report ' + username + '</a>' +
                        '<td><a title="send a private message" href="/private.php?do=newpm&u=' + encodeURIComponent(user_id) + '">talk privately to ' + username + '</a>' +
                        '<td><a title="de-emphasise this person\'s messages" href="/profile.php?do=ignorelist&username=' + encodeURIComponent(username) + '">ignore ' + username + '</a>' +
                        '</tr>';
                }

                $('#vB_Editor_001_textarea').val().replace( /\[quote=([^;]{1,20})(?:;([0-9]*))?\]/gi, function( match, username, post_id ) {
                    if ( !users.hasOwnProperty(username) ) {
                        users[username] = 1;
                        (function(pm_id, username) {
                            // we create a closure so the variables stay the same when the AJAX request returns
                            text +=
                                '<tr><td style="font-weight: bold">' + username +
                                (
                                    post_id
                                    ? '<td><a title="notify the moderators about an unhelpful post" href="/report.php?p=' + post_id + '">report ' + username + '</a>'
                                    : '<td style="color: grey" title="you can only report a specific post">report ' + username + ''
                                ) +
                                '<td id="' + pm_id + '" title="retrieving user ID...">talk privately to ' + username + '' +
                                '<td><a title="de-emphasise this person\'s messages" href="/profile.php?do=ignorelist&username=' + encodeURIComponent(username) + '">ignore ' + username + '</a>' +
                                '</tr>';

                            $.ajax({
                                type: "POST",
                                url: 'http://forums.frontier.co.uk/ajax.php',
                                data: {
                                    'do'           : 'usersearch',
                                    'fragment'     : username,
                                    'securitytoken': $('input[name="securitytoken"]').val()
                                },
                                dataType: 'xml',
                                success: function(data) {
                                    if ( $(data).find( 'user' ).first().text() == username )
                                        $('#'+pm_id)
                                            .html( '<a title="send a private message" href="/private.php?do=newpm&u=' + $(data).find( 'user' ).attr( 'userid' ) + '">talk privately to ' + username + '</a>' )
                                            .removeAttr( 'title' );
                                    else
                                        $('#'+pm_id).parent().remove();
                                },
                                error: function(foo, bar, err) {
                                    $( '#pm_for_' + n ).parent().remove();
                                }
                            });

                        })('pm_for_' + user_count++, username);
                    }
                });

                user_actions.find('legend').text( 'Alternatives' );
                user_actions.find('table,div').remove();
                user_actions.append(
                    text +
                    '<tr><td style="font-weight: bold">Thread' +
                    '<td><a title="Remove this thread from your subscription and user pages" href="/subscription.php?do=removesubscription&t=' + $('input[name="t"]').val() + '">unsubscribe</a>' +
                    '<td style="color: grey; font-weight: bold" title="make your reply visible to everyone in the thread">broadcast message' +
                    '<td><a title="unsubscribe and de-emphasise this thread in listings" href="/subscription.php?do=removesubscription&t=' + $('input[name="t"]').val() + '&ignore=1">ignore</a>' +
                    '</tr>' +
                    '<tr><td colspan="5" style="font-style: italic">&hellip; or why don\'t you just switch off your browser and go blast some Thargoids instead?</tr>' +
                    '</table>'
                );
                $('[name=title]').closest('table').after(user_actions);
            });

            upgrade_editor(query_params);

        },


        /*
         * IGNORE LIST PAGE
         */
        'profile ignorelist': function(query_params) {
            observe_once( '#ignorelist_add_txt', function() {
                if ( query_params.hasOwnProperty('username') )
                    $(this).val( query_params['username'] );
                $('#submit_save')
                    .parent().prepend('<label style="float: left"><input type="checkbox" id="super-ignore">Hide ignored messages completely (&ldquo;super-ignore&rdquo;)</label>')
                    .closest('form').submit(function() {
                        set_variables({'super-ignore-users': $('#super-ignore').is(':checked') });
                    });
                get_variables('super-ignore-users', function(check) { $('#super-ignore').prop('checked', check) });
            });
        },

        /*
         * SIGNATURE PAGE
         */
        'profile signature': function(query_params) {

            // TODO: merge this with the code on the thread page (above)
            observe_once( '#collapseimg_sigperms', function() {
                var known_images = {};
                $('input[value="Save Signature"]').addClass( 'caution-submit-button' );
                $('#vB_Editor_001_textarea').on( 'input', function() {
                    var text = $(this).val();

                    if ( this.getAttribute( 'style' ).search( 'display: none;' ) != -1 ) {
                        if ( $(this).data('non-wysiwyg') ) {
                            text = $(this).data('non-wysiwyg');
                            $(this).removeData('non-wysiwyg');
                        } else {
                            $.ajax({
                                type: "POST",
                                url: 'http://forums.frontier.co.uk/ajax.php',
                                data: {
                                    'do'           : 'editorswitch',
                                    'allowsmilie'  : 1,
                                    'parsetype'    : 'signature',
                                    'securitytoken': $('input[name="securitytoken"]').val(),
                                    'towysiwyg'    : 0,
                                    'message'      : text
                                },
                                dataType: 'text',
                                success: function(data) {
                                    $('#vB_Editor_001_textarea').data('non-wysiwyg', data).trigger('input');
                                },
                            });
                            return;
                        }
                    }

                    var line_count = (text.match( /\n/g )||[]).length + (text.match( /\[(quote|code)[^\]]*\]/gi )||[]).length*2 + 1;
                    caution_reason = '';
                    if ( text.search( /\[SIZE="?[^\]12\"]"?\]/i ) != -1 || text.search( /\[SIZE="?[^"\]]{2,}"?\]/i ) != -1 )
                        caution_reason = "Please make text no larger than size 2";
                    else if ( text.search( /\[img\](.|\n)*\[img\]/i ) != -1 )
                        caution_reason = "Please use at most one image";
                    else if ( text.search( /\[img\].*\[\/img]/i ) == -1 ) {
                        if ( line_count > 5 )
                            caution_reason = "Please use at most 5 lines of text";
                    } else {
                        // one image - need to calculate dimensions before we continue
                        var image = text.split( /\[img\]/i )[1].split( /\[\/img\]/i )[0];
                        function check_text_lines() {
                            var max_line_count =
                                ( known_images[image].height > 120 ) ? 0 :
                                ( known_images[image].height >  90 ) ? 1 :
                                                                       2
                            ;
                            if ( known_images[image].width > 650 )
                                caution_reason = "Please shrink your image to a maximum width of 650 pixels";
                            else if ( known_images[image].height > 150 )
                                caution_reason = "Please shrink your image to a maximum height of 150 pixels";
                            else if ( line_count-1 > max_line_count )
                                caution_reason = "Maximum lines for your image height (" + known_images[image].height + "px) is " + max_line_count;
                            apply_caution();
                        }
                        if ( known_images.hasOwnProperty(image) ) {
                            if ( known_images[image] )
                                check_text_lines();
                        } else {
                            known_images[image] = false; // disable checks while this is loading
                            $('<img>')
                                .one('load', function() {
                                    known_images[$(this).data('src')] = { width: this.clientWidth, height: this.clientHeight };
                                    check_text_lines();
                                })
                                .data( 'src', image )
                                .css({top: -10000, left: -10000, position:'absolute'})
                                .attr( 'src',  image )
                                .appendTo(document.body)
                            ;
                        }
                    }
                    if ( (query_params['do']||'') == 'editsignature' && !caution_reason )
                        caution_reason = 'Preview your post to make sure it reads well';
                    apply_caution();
                }).trigger('input');

                // Show forum rules:
                var forum_panel = $('<tr><td class="tcat">Signature rules</td></tr><tr><td class="panelsurround" align="center"><div id="rules-panel" class="panel" style="text-align: left"></div><p>Always check the signature rules for issues this page was unable to detect.</p></td></tr>').insertAfter( $('#vB_Editor_001_mode').closest('tr') );
                forum_panel.find('#rules-panel').load( 'http://forums.frontier.co.uk/showpost.php?p=421867&postcount=1 #post_message_421867', function() {
                        $(this).html( $(this).html().replace( /(.|\n)*(<b>signature rules)/i, "$2" ) );
                });

            });
        }

    };

})();
