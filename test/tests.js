/* Trigger an event that test-dispatcher listens for.
 * We can send any number of arguments, but the default dispatcher
 * wants a single hash with an array of handlers and an array of query_params
 */
function dispatch() {
    var dispatcher = document.getElementById('rendezvous');
    dispatcher.setAttribute( 'data-dispatch', JSON.stringify(arguments) );
    dispatcher.click();
}
function dispatch_js(js) {
    var dispatcher = document.getElementById('rendezvous');
    dispatcher.setAttribute( 'data-dispatch', JSON.stringify([{ 'js': js }]) );
    dispatcher.click();
}

function get_stored_values() {
    return document.getElementById('rendezvous').getAttribute( 'data-stored-values' );
}

QUnit.test( "All pages", function( assert ) {

    var old_cookie = document.cookie;
    setTimeout( function() { document.cookie = old_cookie }, 0);
    document.cookie = '';

    var old_confirm = window.confirm, old_setTimeout = window.setTimeout;
    setTimeout( function() { window.confirm = old_confirm; window.setTimeout = old_setTimeout }, 0);
    var confirm_call_inputs = [], confirm_return = false;
    window.confirm = function(message) {
        confirm_call_inputs.push(message);
        return confirm_return;
    };
    var setTimeout_calls = 0;
    window.setTimeout = function() {
        ++setTimeout_calls;
    };

    dispatch({ handlers: [''], query_params: {} });

    // Cookies updated on click:
    $('#cookie-test').click(function(event) {
        event.preventDefault();
    })[0].click();
    assert.equal( document.cookie, "bbthread_lastview=", "document.cookie is set correctly" );

    // Ordinary confirm() messages are let through:
    assert.equal( confirm('blah'), confirm_return, "Ordinary confirm() call returns correctly" );
    assert.equal( confirm("You have a new private message.\n\n"), confirm_return, "Captured confirm() call returns correctly" );
    assert.equal( setTimeout_calls, 0, "setTimeout() not yet called" );

    confirm_return = true;
    assert.equal( confirm('blah'), confirm_return, "Ordinary confirm() call returns correctly" );
    assert.equal( confirm("You have a new private message.\n\n"), false, "Captured confirm() call returns correctly" );
    assert.equal( setTimeout_calls, 1, "setTimeout() called" );

    assert.deepEqual( confirm_call_inputs, ["blah","You have a new private message.\n\n","blah","You have a new private message.\n\n"], "Correct sequence of confirm() calls observed" );

    document.cookie = old_cookie;
    window.confirm = old_confirm;
    window.setTimeout = old_setTimeout;

});

QUnit.test( "Forum display page", function( assert ) {

    $('#qunit-fixture').children().not('#forum-display-test').remove();

    dispatch({ handlers: ['forumdisplay'], query_params: {} });

    assert.notEqual( $('.should' +'-append').html(), '<div class="navbar"></div>', 'should-append appended correctly' );
    assert.   equal( $('.should-not-append').html(), '<div class="navbar"></div>', 'should-not-append not appended' );

});

QUnit.test( "Search pages - failed searches", function( assert ) {

    $('#qunit-fixture').children().not('#search-test').remove();
    dispatch({ handlers: ['search'], query_params: {} });

    assert.notEqual( $("#should-be-googled").html().search('Search with Google'), -1 );

    assert.notEqual( $('.should' +'-append').html(), '<div class="navbar"></div>', 'should-append appended correctly' );
    assert.   equal( $('.should-not-append').html(), '<div class="navbar"></div>', 'should-not-append not appended' );

});

QUnit.test( "Search pages - today's posts", function( assert ) {

    $('#qunit-fixture').children().not('#search-test').remove();
    dispatch({ handlers: ['search'], query_params: {} });

    assert.equal( $('.should-append a').attr('href'), '/search.php?do=getnew', 'Correct permalink' );
    assert.equal( $('.should-not-append').html(), '<div class="navbar"></div>', 'should-not-append not appended' );

});

QUnit.test( "Search pages - new posts", function( assert ) {

    $('#qunit-fixture').children().not('#search-test').remove();
    $('#inlinemodform div').text('Posts From Last Day');
    dispatch({ handlers: ['search'], query_params: {} });

    assert.equal( $('.should-append a').attr('href'), '/search.php?do=getdaily', 'Correct permalink' );
    assert.   equal( $('.should-not-append').html(), '<div class="navbar"></div>', 'should-not-append not appended' );

});

QUnit.test( "Search pages - search user", function( assert ) {

    $('#qunit-fixture').children().not('#search-test').remove();
    $('#inlinemodform div').html( 'Posts Made By: <span id="threadslist"><a href="member.php?u=12345">Some user</a></span>' );
    dispatch({ handlers: ['search'], query_params: {} });
    assert.equal( $('.should-append a').attr('href'), '/search.php?do=finduser&u=12345', 'Correct permalink' );
    assert.   equal( $('.should-not-append').html(), '<div class="navbar"></div>', 'should-not-append not appended' );

});

QUnit.test( "Search pages - query", function( assert ) {

    $('#qunit-fixture').children().not('#search-test').remove();
    $('#inlinemodform a').attr( 'href', 'search.php?starteronly=01&exactname=0&query=foo&humanverify[]=blah' );
    dispatch({ handlers: ['search'], query_params: {} });

    assert.notEqual( $('.tfoo').html(), '', 'Correct Google link' );
    assert.equal( $('.should-append a').attr('href'),  "/search.php?do=process&starteronly=01&query=foo", 'Correct permalink' );

});

QUnit.test( "Subscription pages", function( assert ) {

    dispatch({ handlers: ['subscription'], query_params: {ignore:1,t:1234}, stored_values: { 'ignored-threads': '' } });
    assert.equal( get_stored_values(),'{"ignored-threads":" 1234 "}', 'ignored_threads set correctly' );

    dispatch({ handlers: ['subscription'], query_params: {ignore:1,t:1234,do:'addsubscription'}, stored_values: { 'ignored-threads': '' } });
    assert.equal( get_stored_values(),'{"ignored-threads":" "}', 'ignored_threads set correctly' );

});

QUnit.test( "Ignore threads", function( assert ) {

    dispatch({ handlers: ['subscription viewsubscription'], query_params: {}, stored_values: { 'ignored-threads': ' 1234 ', 'super-ignore-threads': 1 } });

    assert.equal( $('#thread_title_1,#thread_title_12,#thread_title_123,#thread_title_12345').filter(':visible').length, 4, "non-ignored threads still visible" );
    assert.equal( $('#thread_title_1234').not(':visible').length, 1, "ignored thread invisible" );

});

QUnit.test( "Show thread page", function( assert ) {

    $('#qunit-fixture').children().not('#showthread-test').remove();

    dispatch({ handlers: ['showthread'], query_params: {}, stored_values: { 'ignored-threads': ' 123 ', 'super-ignore-users': 1 } });

    assert.notEqual( $('.should' +'-append').html(), '<div class="navbar"></div>', 'should-append appended correctly' );
    assert.   equal( $('.should-not-append').html(), '<div class="navbar"></div>', 'should-not-append not appended' );

    assert.equal( $('#threadtools_menu tr').length, 3, 'One subscription link added' );
    assert.equal( $('.should-hide').not(':visible').length, 1, 'One post hidden' );
    assert.equal( $('.should-not-hide').filter(':visible').length, 1, 'One post not hidden' );

});

QUnit.asyncTest( "Create thread page", function( assert ) {

    $('#qunit-fixture').children().not('#newthread-test').remove();

    dispatch({ handlers: ['newthread'], query_params: {}, stored_values: {}, mockjax_options: [
        { // FAQ
            url: "http://forums.frontier.co.uk/showpost.php?p=454458&postcount=1",
            responseText: '<div><div id="post_message_454458"><a href="http://example.com/1">foo</a></div></div>',
            responseTime: 0
        },
        { // Common topics 1
            url: "http://forums.frontier.co.uk/showpost.php?p=431402&postcount=1",
            responseText: '<div><div id="post_message_431402"><a href="http://example.com/2">bar</a></div></div>',
            responseTime: 0
        },
        { // Common topics 2
            url: "http://forums.frontier.co.uk/showpost.php?p=431405&postcount=2",
            responseText: '<div><div id="post_message_431405"><a href="http://example.com/3">foo bar</a></div></div>',
            responseTime: 0
        },
        { // common topics 3
            url: "http://forums.frontier.co.uk/showpost.php?p=431507&postcount=3",
            responseText: '<div><div id="post_message_431507"><a href="http://example.com/4">bar baz</a></div></div>',
            responseTime: 0
        },
        { // today's posts
            url: "http://forums.frontier.co.uk/search.php?do=getdaily",
            responseText: '<div><a id="thread_title_12345" href="http://example.com/5">qux</a></div>',
            responseTime: 0
        }
    ]});

    var alternatives = $('#newthread-test').children().last();
    assert.ok( alternatives.is('fieldset'), '"Alternatives" fieldset added' );
    assert.equal( alternatives.children('legend').text(), 'Alternatives', 'Alternatives set correctly' );

    assert.notEqual( alternatives.find('.should' +'-alter').last().html(), '', 'should-alter altered correctly' );
    assert.   equal( alternatives.find('.should-not-alter').last().html(), '', 'should-not-alter not altered' );

    assert.equal( $('#suggestions li').length, 2, "Suggestion box initialised with two suggestions" );
    $('[name=subject]').val('foo bar');

    setTimeout(function() {
        assert.equal( $('#suggestions').html(), '<li><a href="http://example.com/3">foo bar</a></li><li><a href="http://example.com/1">foo</a></li><li><a href="http://example.com/2">bar</a></li><li><a href="http://example.com/4">bar baz</a></li><li><a href="http://forums.frontier.co.uk/showthread.php?t=20322">FAQ</a></li>', "Suggestion box updated correctly" );
        QUnit.start();
    }, 50 );

});

QUnit.asyncTest( "Editor upgrades - warnings", function( assert ) {

    $('#qunit-fixture').children().not('#editor-test').remove();
    $('#vB_Editor_001_textarea').val('');

    dispatch({ handlers: ['newthread'], query_params: {'do': 'new'}, stored_values: {} });

    var tests = [
        {
            expected: null,
            name: 'Caution box initialised correctly',
        },
        {
            input: '**',
            expected: null,
            name: 'Two stars causes no error',
        },
        {
            input: '***',
            expected: "Masked swearing will receive moderator action - rephrase the sentence so as not to put the thought in your readers' heads",
            name: 'Three stars causes an error',
        },
        {
            input: '[quote][/quote]',
            expected: null,
        },
        {
            input: '[quot][/quote]',
            expected: "Make sure to match every [quote] and [/quote]",
        },
        {
            input: '[quote]',
            expected: "Make sure to match every [quote] and [/quote]",
        },
        {
            input: '[quote]\n[/quote]',
            expected: null
        },
        {
            input: '[quote=user;12345]\n[/quote]',
            expected: null
        },
        {
            input: '[quote][/quot]',
            expected: "Make sure to match every [quote] and [/quote]",
        }
    ];

    var interval = setInterval(function() {
        assert.equal( $('#caution-box').text(), tests[0].expected || "Preview your post to make sure it reads well", tests[0].name || tests[0].input );
        tests.shift();
        if ( tests.length ) {
            $('#vB_Editor_001_textarea').val(tests[0].input);
            dispatch_js( "$('#vB_Editor_001_textarea').trigger('input')" );
        } else {
            clearInterval(interval);
            QUnit.start();
        }
    }, 10 );

});

QUnit.test( "Editor upgrades - links", function( assert ) {

    $('#qunit-fixture').children().not('#editor-test').remove();

    dispatch({ handlers: ['newthread'], query_params: {'do': 'new'}, stored_values: {} });

    var tests = [
        {
            input: '',
            name: 'Text area initialised correctly',
        },
        {
            input: 'http://www.example.com/foo',
            expected: null,
            name: 'Unrelated link not touched',
        },

        // Plain links to posts on thread pages:
        {
            input: 'http://forums.frontier.co.uk/showthread.php?p=1234#post1234',
            expected: '[post=1234]post #1234[/post]',
        },
        {
            input: 'http://forums.frontier.co.uk/showthread.php?p=1234',
            expected: '[post=1234]post #1234[/post]',
        },
        {
            input: '/showthread.php?p=1234#post1234',
            expected: '[post=1234]post #1234[/post]',
        },
        {
            input: '/showthread.php?p=1234',
            expected: '[post=1234]post #1234[/post]',
        },
        // Plain links to posts on post pages:
        {
            input: 'http://forums.frontier.co.uk/showpost.php?p=1234&postcount=9',
            expected: '[post=1234]post #1234[/post]',
        },
        {
            input: 'http://forums.frontier.co.uk/showpost.php?p=1234',
            expected: '[post=1234]post #1234[/post]',
        },
        {
            input: '/showpost.php?p=1234&postcount=9',
            expected: '[post=1234]post #1234[/post]',
        },
        {
            input: '/showpost.php?p=1234',
            expected: '[post=1234]post #1234[/post]',
        },
        // Plain links to thread pages:
        {
            input: 'http://forums.frontier.co.uk/showthread.php?t=123&page=2',
            expected: '[thread=123]thread #123[/thread]',
        },
        {
            input: 'http://forums.frontier.co.uk/showthread.php?t=123',
            expected: '[thread=123]thread #123[/thread]',
        },
        {
            input: '/showthread.php?t=123&page=2',
            expected: '[thread=123]thread #123[/thread]',
        },
        {
            input: '/showthread.php?t=123',
            expected: '[thread=123]thread #123[/thread]',
        },

        // Links to posts on thread pages embedded within [url]:
        {
            input: '[url]http://forums.frontier.co.uk/showthread.php?p=1234#post1234[/url]',
            expected: '[post=1234]post #1234[/post]',
        },
        {
            input: '[url]http://forums.frontier.co.uk/showthread.php?p=1234[/url]',
            expected: '[post=1234]post #1234[/post]',
        },
        {
            input: '[url]/showthread.php?p=1234#post1234[/url]',
            expected: '[post=1234]post #1234[/post]',
        },
        {
            input: '[url]/showthread.php?p=1234[/url]',
            expected: '[post=1234]post #1234[/post]',
        },
        // Links to posts on post pages embedded within [url]:
        {
            input: '[url]http://forums.frontier.co.uk/showpost.php?p=1234&postcount=9[/url]',
            expected: '[post=1234]post #1234[/post]',
        },
        {
            input: '[url]http://forums.frontier.co.uk/showpost.php?p=1234[/url]',
            expected: '[post=1234]post #1234[/post]',
        },
        {
            input: '[url]/showpost.php?p=1234&postcount=9[/url]',
            expected: '[post=1234]post #1234[/post]',
        },
        {
            input: '[url]/showpost.php?p=1234[/url]',
            expected: '[post=1234]post #1234[/post]',
        },
        // Links to thread pages embedded within [url]:
        {
            input: '[url]http://forums.frontier.co.uk/showthread.php?t=123&page=2[/url]',
            expected: '[thread=123]thread #123[/thread]',
        },
        {
            input: '[url]http://forums.frontier.co.uk/showthread.php?t=123[/url]',
            expected: '[thread=123]thread #123[/thread]',
        },
        {
            input: '[url]/showthread.php?t=123&page=2[/url]',
            expected: '[thread=123]thread #123[/thread]',
        },
        {
            input: '[url]/showthread.php?t=123[/url]',
            expected: '[thread=123]thread #123[/thread]',
        },

        // Links to posts on thread pages embedded within [url=""]:
        {
            input: '[url="http://forums.frontier.co.uk/showthread.php?p=1234#post1234"]foo[/url]',
            expected: '[post=1234]foo[/post]',
        },
        {
            input: '[url="http://forums.frontier.co.uk/showthread.php?p=1234"]foo[/url]',
            expected: '[post=1234]foo[/post]',
        },
        {
            input: '[url="/showthread.php?p=1234#post1234"]foo[/url]',
            expected: '[post=1234]foo[/post]',
        },
        {
            input: '[url="/showthread.php?p=1234"]foo[/url]',
            expected: '[post=1234]foo[/post]',
        },
        // Links to posts on post pages embedded within [url=":
        {
            input: '[url="http://forums.frontier.co.uk/showpost.php?p=1234&postcount=9"]foo[/url]',
            expected: '[post=1234]foo[/post]',
        },
        {
            input: '[url="http://forums.frontier.co.uk/showpost.php?p=1234"]foo[/url]',
            expected: '[post=1234]foo[/post]',
        },
        {
            input: '[url="/showpost.php?p=1234&postcount=9"]foo[/url]',
            expected: '[post=1234]foo[/post]',
        },
        {
            input: '[url="/showpost.php?p=1234"]foo[/url]',
            expected: '[post=1234]foo[/post]',
        },
        // Links to thread pages embedded within [url=":
        {
            input: '[url="http://forums.frontier.co.uk/showthread.php?t=123&page=2"]foo[/url]',
            expected: '[thread=123]foo[/thread]',
        },
        {
            input: '[url="http://forums.frontier.co.uk/showthread.php?t=123"]foo[/url]',
            expected: '[thread=123]foo[/thread]',
        },
        {
            input: '[url="/showthread.php?t=123&page=2"]foo[/url]',
            expected: '[thread=123]foo[/thread]',
        },
        {
            input: '[url="/showthread.php?t=123"]foo[/url]',
            expected: '[thread=123]foo[/thread]',
        },

        // Links to posts on thread pages embedded within [url=]:
        {
            input: '[url=http://forums.frontier.co.uk/showthread.php?p=1234#post1234]foo[/url]',
            expected: '[post=1234]foo[/post]',
        },
        {
            input: '[url=http://forums.frontier.co.uk/showthread.php?p=1234]foo[/url]',
            expected: '[post=1234]foo[/post]',
        },
        {
            input: '[url=/showthread.php?p=1234#post1234]foo[/url]',
            expected: '[post=1234]foo[/post]',
        },
        {
            input: '[url=/showthread.php?p=1234]foo[/url]',
            expected: '[post=1234]foo[/post]',
        },
        // Links to posts on post pages embedded within [url=:
        {
            input: '[url=http://forums.frontier.co.uk/showpost.php?p=1234&postcount=9]foo[/url]',
            expected: '[post=1234]foo[/post]',
        },
        {
            input: '[url=http://forums.frontier.co.uk/showpost.php?p=1234]foo[/url]',
            expected: '[post=1234]foo[/post]',
        },
        {
            input: '[url=/showpost.php?p=1234&postcount=9]foo[/url]',
            expected: '[post=1234]foo[/post]',
        },
        {
            input: '[url=/showpost.php?p=1234]foo[/url]',
            expected: '[post=1234]foo[/post]',
        },
        // Links to thread pages embedded within [url=:
        {
            input: '[url=http://forums.frontier.co.uk/showthread.php?t=123&page=2]foo[/url]',
            expected: '[thread=123]foo[/thread]',
        },
        {
            input: '[url=http://forums.frontier.co.uk/showthread.php?t=123]foo[/url]',
            expected: '[thread=123]foo[/thread]',
        },
        {
            input: '[url=/showthread.php?t=123&page=2]foo[/url]',
            expected: '[thread=123]foo[/thread]',
        },
        {
            input: '[url=/showthread.php?t=123]foo[/url]',
            expected: '[thread=123]foo[/thread]',
        },

        // Links within quotes:
        {
            input: '[quote][url]http://forums.frontier.co.uk/showthread.php?t=123[/url][/quote]',
            expected: '[quote][url]http://forums.frontier.co.uk/showthread.php?t=123[/url][/quote]',
        },
        {
            input: '[quote][url]http://forums.frontier.co.uk/showthread.php?t=123[/url][/quote][quote][url]http://forums.frontier.co.uk/showthread.php?p=1234[/url][/quote]',
            expected: '[quote][url]http://forums.frontier.co.uk/showthread.php?t=123[/url][/quote][quote][url]http://forums.frontier.co.uk/showthread.php?p=1234[/url][/quote]',
        },
        {
            input: '[quote][url]http://forums.frontier.co.uk/showthread.php?t=123[/url][quote][url]http://forums.frontier.co.uk/showthread.php?p=1234[/url][/quote][/quote]',
            expected: '[quote][url]http://forums.frontier.co.uk/showthread.php?t=123[/url][quote][url]http://forums.frontier.co.uk/showthread.php?p=1234[/url][/quote][/quote]',
        },
        {
            input: '[url]http://forums.frontier.co.uk/showthread.php?t=123[/url][quote][url]http://forums.frontier.co.uk/showthread.php?t=123[/url][quote][url]http://forums.frontier.co.uk/showthread.php?p=1234[/url][/quote][/quote][url]http://forums.frontier.co.uk/showthread.php?p=1234[/url]',
            expected: '[thread=123]thread #123[/thread][quote][url]http://forums.frontier.co.uk/showthread.php?t=123[/url][quote][url]http://forums.frontier.co.uk/showthread.php?p=1234[/url][/quote][/quote][post=1234]post #1234[/post]',
        }

    ];

    for ( var n=0; n!=tests.length; ++n ) {
        $('#vB_Editor_001_textarea').val( tests[n].input );
        window.vB_Editor = {
            vB_Editor_001: {
                get_editor_contents: function(contents) { return tests[n].input; }
            }
        };
        $('#links-to-vbcode').click();
        assert.equal( $('#vB_Editor_001_textarea').val(), tests[n].expected || tests[n].input, tests[n].name || tests[n].input );
    }

});

QUnit.test( "Editor upgrades - drafts", function( assert ) {

    $('#qunit-fixture').children().not('#editor-test').remove();

    dispatch({ handlers: ['newthread'], query_params: {'do': 'new'}, stored_values: {} });

    assert.equal( $('.should-be-appended').children().length, 3, '"Save to drafts" button appended' );

});

QUnit.asyncTest( "Reply test", function( assert ) {

    $('#qunit-fixture').children().not('#reply-test').remove();

    dispatch({ handlers: ['newreply'], query_params: {'username': 'foo', u: '1234', 'p': 2345}, mockjax_options: [
        {
            url: "http://forums.frontier.co.uk/ajax.php",
            responseXML: '<users><user userid="123">bar</user><user userid="456">user_bar</user></users>',
            responseTime: 0
        }
    ]});

    assert.equal( $('.should-be-appended').children().length, 2, '"Alternatives" section added' );
    assert.equal( $('.should-be-appended').children().last().html().replace( /^\s*/, '' ),'<table style="margin:0 auto; text-align: center"><tbody><tr><td style="font-weight: bold">foo</td><td><a title="notify the moderators about an unhelpful post" href="/report.php?p=2345">report foo</a></td><td><a title="send a private message" href="/private.php?do=newpm&amp;u=1234">talk privately to foo</a></td><td><a title="de-emphasise this person\'s messages" href="/profile.php?do=ignorelist&amp;username=foo">ignore foo</a></td></tr><tr><td style="font-weight: bold">bar</td><td><a title="notify the moderators about an unhelpful post" href="/report.php?p=1">report bar</a></td><td id="pm_for_1" title="retrieving user ID...">talk privately to bar</td><td><a title="de-emphasise this person\'s messages" href="/profile.php?do=ignorelist&amp;username=bar">ignore bar</a></td></tr><tr><td style="font-weight: bold">Thread</td><td><a title="Remove this thread from your subscription and user pages" href="/subscription.php?do=removesubscription&amp;t=12345">unsubscribe</a></td><td style="color: grey; font-weight: bold" title="make your reply visible to everyone in the thread">broadcast message</td><td><a title="unsubscribe and de-emphasise this thread in listings" href="/subscription.php?do=removesubscription&amp;t=12345&amp;ignore=1">ignore</a></td></tr><tr><td colspan="5" style="font-style: italic">… or why don\'t you just switch off your browser and go blast some Thargoids instead?</td></tr></tbody></table>' );

    setTimeout(function() {
        assert.equal( $('.should-be-appended').children().last().html().replace( /^\s*/, '' ),'<table style="margin:0 auto; text-align: center"><tbody><tr><td style="font-weight: bold">foo</td><td><a title="notify the moderators about an unhelpful post" href="/report.php?p=2345">report foo</a></td><td><a title="send a private message" href="/private.php?do=newpm&amp;u=1234">talk privately to foo</a></td><td><a title="de-emphasise this person\'s messages" href="/profile.php?do=ignorelist&amp;username=foo">ignore foo</a></td></tr><tr><td style="font-weight: bold">bar</td><td><a title="notify the moderators about an unhelpful post" href="/report.php?p=1">report bar</a></td><td id="pm_for_1"><a title="send a private message" href="/private.php?do=newpm&amp;u=123">talk privately to bar</a></td><td><a title="de-emphasise this person\'s messages" href="/profile.php?do=ignorelist&amp;username=bar">ignore bar</a></td></tr><tr><td style="font-weight: bold">Thread</td><td><a title="Remove this thread from your subscription and user pages" href="/subscription.php?do=removesubscription&amp;t=12345">unsubscribe</a></td><td style="color: grey; font-weight: bold" title="make your reply visible to everyone in the thread">broadcast message</td><td><a title="unsubscribe and de-emphasise this thread in listings" href="/subscription.php?do=removesubscription&amp;t=12345&amp;ignore=1">ignore</a></td></tr><tr><td colspan="5" style="font-style: italic">… or why don\'t you just switch off your browser and go blast some Thargoids instead?</td></tr></tbody></table>' );
        QUnit.start();
    }, 50 );

});

QUnit.test( "Ignore test", function( assert ) {

    $('#qunit-fixture').children().not('#ignore-test').remove();

    dispatch({ handlers: ['profile ignorelist'], query_params: {'username': 'foo'} });

    assert.equal( $('#ignorelist_add_txt').val(), 'foo', 'Username set correctly' );

});
