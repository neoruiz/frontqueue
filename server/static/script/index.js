$(document).ready(function(){
    $.ajax({
        url : '/queue/123',
        success: function(data){
            $.each(data.queue, function(index, guest){
                $('.queue-list').append(
                    '<li class="js-notify queue-list__item" data-guest-id="'+ guest.id +'"><span class="name">'
                     + guest.lastname + ', ' 
                     + guest.firstname + 
                    '</span><span class="queue-list__guest-actions">' +
                    '<span class="queue-list__guest-action-item notify"><i class="fa fa-bullhorn" aria-hidden="true"></i><span class="label">notify</span></span>' +
                    '<span class="queue-list__guest-action-item checkin"> <i class="fa fa-check-square" aria-hidden="true"></i><span class="label">check in</span></span>' +
                    '<span class="queue-list__guest-action-item movedown"><i class="fa fa-arrow-down" aria-hidden="true"></i><span class="label">move down</span></span>' +
                    '<span class="queue-list__guest-action-item cancel"><i class="fa fa-window-close" aria-hidden="true"></i><span class="label">cancel</span></span>' +
                    '</span></li>');
            });

            $('.js-notify').on('click',function(){
                var guestId = $(this).data('guest-id');

                $.ajax({
                    url: '/notify/' + guestId,
                    type: 'POST',
                    success: function( data ){
                        console.log(data);
                    }
                });
            });
        }
    });
});