window.BabelExt = (function(mocked_BabelExt) {

    var stored_values;

    $(document).on( 'click', '#rendezvous', function( event ) {
        var command         = JSON.parse(this.getAttribute('data-dispatch'))[0],
            handlers        = command['handlers'],
            query_params    = command['query_params'],
            mockjax_options = command['mockjax_options'] || [],
            js              = command['js']
        ;
        if ( js ) {
            eval(js);
        } else {
            stored_values = command['stored_values'] || {};
            this.setAttribute( 'data-stored-values', JSON.stringify(stored_values) );

            $.mockjaxClear();
            for ( var n=0; n!=mockjax_options.length; ++n )
                $.mockjax.call( $, mockjax_options[n] );

            for ( var n=0; n!=handlers.length; ++n )
                dispatch_handlers[handlers[n]].call( this, query_params );
        }

    });

    return {
        storage: {
            set: function( key, value, callback ) {
                if ( callback ) {
                    stored_values[key] = value;
                    document
                        .getElementById('rendezvous')
                        .setAttribute( 'data-stored-values', JSON.stringify(stored_values) );
                    callback();
                }
            },
            get: function( key, callback ) {
                if ( callback ) {
                    callback({ value: stored_values[key] });
                }
            }
        }
    };
})(window.BabelExt);
