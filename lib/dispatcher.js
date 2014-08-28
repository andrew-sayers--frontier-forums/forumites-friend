(function() {

    /*
     * the 'query_params' variable contains a hash of URL parameters
     */
    var query_params_array = window.location.search.substr(1).split('&'), query_params = {};
    for ( var n=0; n!=query_params_array.length; ++n )
        query_params[ decodeURIComponent(query_params_array[n].split('=')[0]) ] = decodeURIComponent(query_params_array[n].split('=')[1]);

    /*
     * PAGE HANDLERS
     */

    if (dispatch_handlers.hasOwnProperty(''))
        dispatch_handlers[''].call( this, query_params );

    var pathname = location.pathname.substr(1).split('.')[0];

    if (dispatch_handlers.hasOwnProperty(pathname))
        dispatch_handlers[pathname].call( this, query_params );

    if ( query_params.hasOwnProperty('do') && query_params['do'] != '' ) {
        pathname += ' ';
        if ( query_params['do'].search( /signature$/ ) != -1 )
            pathname += 'signature';
        else
            pathname += query_params['do'];
        if ( dispatch_handlers.hasOwnProperty(pathname) )
            dispatch_handlers[pathname].call( this, query_params );
    }

})();
