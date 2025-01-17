document.addEventListener("DOMContentLoaded", function() {
    var header = $("meta[name='_csrf_header']").attr('content');
    var token = $("meta[name='_csrf']").attr('content');

    // 토글 버튼 이벤트 리스너
    var toggleButtons = document.querySelectorAll('.toggle-button');
    toggleButtons.forEach(function(button) {
        button.addEventListener('click', function(event) {
            var options = this.parentElement.querySelector('.options');
            if (options.style.display === "block") {
                options.style.display = "none";
            } else {
                closeAllOptions();
                options.style.display = "block";
            }
            event.stopPropagation();
        });
    });

    document.addEventListener('click', function(event) {
        var options = document.querySelectorAll('.options');
        options.forEach(function(option) {
            if (option.style.display === "block" && !option.contains(event.target)) {
                option.style.display = "none";
            }
        });
    });

    function closeAllOptions() {
        var options = document.querySelectorAll('.options');
        options.forEach(function(option) {
            option.style.display = "none";
        });
    }

    function del_check() {
        return confirm("정말로 이 게시물을 삭제하겠습니까?");
    }

    function search(searchInput, searchType) {
        var searchArray = searchInput.split(",");

        for (var i = 0; i < searchArray.length; i++) {
            var searchTerm = searchArray[i].trim();

            if (searchTerm.startsWith("#")) {
                searchTerm = searchTerm.substring(1).trim();
            }

            searchArray[i] = searchTerm;
        }

        document.getElementById("searchInput").value = searchArray.join(",");

        $.ajax({
            url: "/community_board",
            method: "GET",
            data: {
                searchInput: searchArray.join(","),
                searchType: searchType
            },
            success: function(data) {
                var searchResultsHtml = $(data).find("#search-results").html();
                $("#search-results").html(searchResultsHtml);

                var paginationHtml = $(data).find(".pagination").html();
                $(".pagination").html(paginationHtml);
            },
            error: function(xhr, status, error) {
                console.error("Search request failed:", status, error);
            }
        });

        return false;
    }

    $('.hashtag-item').on('click', function() {
        var hashtagText = $(this).text();
        var searchInput = hashtagText;
        var searchType = "";

        search(searchInput, searchType);
    });

    $('.comment-button').on('click', function() {
        var mateno = $(this).data('mateno');
        var commentSectionId = '#comment-section-' + mateno;
        $(commentSectionId).toggle();
        loadComments(mateno);
    });

    $(document).on('submit', '.commentForm', function(event) {
        event.preventDefault();
        var mateno = $(this).data('mateno');
        var commentText = $(this).find('.commentText').val().trim();

        if (commentText !== '') {
            $.ajax({
                type: 'POST',
                url: '/comments/add/' + mateno,
                beforeSend: function(xhr){
                    xhr.setRequestHeader(header, token);
                },
                contentType: 'application/json',
                data: JSON.stringify({
                    commentText: commentText,
                }),
                success: function(response) {
                    console.log('댓글이 성공적으로 추가되었습니다.');
                    loadComments(mateno);
                    $(this).find('.commentText').val('');
                }.bind(this),
                error: function(xhr, status, error) {
                    console.error('댓글 추가 중 오류가 발생했습니다:', xhr.responseText);
                }
            });
        } else {
            alert('댓글 내용을 입력하세요.');
        }
    });

    $(document).on('click', '.edit-comment-button', function() {
        var commentNo = $(this).data('commentid');
        var mateno = $(this).data('mateno');

        $.ajax({
            type: 'PUT',
            url: '/comments/update/' + commentNo,
            beforeSend:function(xhr){
                xhr.setRequestHeader(header, token);
            },
            contentType:'application/json',
            data: JSON.stringify({}),
            success: function(response){
                if(response === "권한 확인됨"){
                    var newCommentText = prompt('댓글을 수정하세요:','');
                    if(newCommentText !== null && newCommentText.trim()!==''){
                        $.ajax({
                            type: 'PUT',
                            url: '/comments/update/' + commentNo,
                            beforeSend:function(xhr){
                                xhr.setRequestHeader(header, token);
                            },
                            contentType:'application/json',
                            data: JSON.stringify({
                                commentText: newCommentText
                            }),
                            success: function(response){
                                loadComments(mateno);
                            },
                            error: function(xhr,status,error){
                                alert("댓글 수정 중 오류가 발생했습니다.");
                            }
                        });
                    } else {
                        alert('댓글 내용을 입력하세요.');
                    }
                }
            },
            error:function(xhr,status,error){
                alert(xhr.responseText);
                if(xhr.status === 403){
                    alert("댓글 수정 권한이 없습니다.");
                } else {
                    alert("댓글 수정 중 오류가 발생했습니다.");
                }
            }
        });
    });

    $(document).on('click', '.delete-comment-button', function() {
        var commentNo = $(this).data('commentno');

        if (confirm('이 댓글을 삭제하시겠습니까?')) {
            $.ajax({
                url: '/comments/delete/' + commentNo,
                type: 'DELETE',
                beforeSend: function(xhr){
                    xhr.setRequestHeader(header, token);
                },
                success: function(response) {
                    alert('댓글이 삭제되었습니다.');
                    $('#comment-' + commentNo).remove(); // 해당 댓글만 삭제
                },
                error: function(xhr, status, error) {
                    console.error('댓글 삭제 실패:', error);
                    alert('댓글 삭제 권한이없습니다.');
                }
            });
        }
    });

    // 대댓글 버튼 클릭 시 대댓글 폼 토글
    $(document).on("click", ".reply-button", function() {
        var commentId = $(this).data("commentid");
        $("#reply-form-" + commentId).toggle();
    });

    // 대댓글 폼 제출 처리
    $(document).on('submit', '.replyForm', function(event) {
        event.preventDefault();
        var form = $(this);
        var mateno = form.data('mateno');
        var commentText = form.find('.replyText').val().trim();
        var parentCommentId = form.find('input[name="parentCommentId"]').val();

        if (commentText !== '') {
            $.ajax({
                type: 'POST',
                url: '/comments/addReply/' + mateno+'?parentCommentId=' + parentCommentId,
                beforeSend: function(xhr) {
                    xhr.setRequestHeader(header, token);
                },
                contentType: 'application/json',
                data: JSON.stringify({
                    commentText: commentText,
                }),
                success: function(response) {
                    console.log('대댓글이 성공적으로 추가되었습니다.');
                    var newReply = `
                        <div class="reply">
                            <p>${response.commentWriter}: ${response.commentText}</p>
                        </div>
                    `;
                    $('#reply-list-' + parentCommentId).append(newReply);
                    form.find('.replyText').val('');
                },
                error: function(xhr, status, error) {
                    console.error('대댓글 추가 중 오류가 발생했습니다:', xhr.responseText);
                }
            });
        } else {
            alert('대댓글 내용을 입력하세요.');
        }
    });

    function loadComments(mateno) {
        console.log("Loading comments for mateno: " + mateno);
        $.ajax({
            type: 'GET',
            url: '/comments/list/' + mateno,
            success: function(comments) {
                var commentSection = $('#comment-list-' + mateno);
                commentSection.empty();

                if (comments.length > 0) {
                    $.each(comments, function(index, comment) {
                        var commentHtml = `
                            <div class="comment" id="comment-${comment.commentNo}">
                                <p class="comment-writer">${comment.commentWriter}</p>
                                <p class="comment-text">${comment.commentText}</p>
                                <button class="edit-comment-button" data-commentid="${comment.commentNo}" data-mateno="${mateno}">수정</button>
                                <button class="delete-comment-button" data-commentno="${comment.commentNo}" data-mateno="${mateno}">삭제</button>
                                <button class="reply-button" data-commentid="${comment.commentNo}">댓글달기</button>
                                <div id="reply-form-${comment.commentNo}" class="reply-form" style="display: none;">
                                    <form method="post" class="replyForm" data-mateno="${mateno}">
                                        <input type="hidden" name="commentWriter" id="commentWriter">
                                        <input type="text" name="commentText" class="replyText" placeholder="대댓글 입력">
                                        <input type="hidden" name="parentCommentId" value="${comment.commentNo}">
                                        <button type="submit">대댓글 추가</button>
                                    </form>
                                </div>
                                <div id="reply-list-${comment.commentNo}" class="reply-list">
                                    ${comment.childComments.map(reply => `
                                        <div class="reply">
                                            <p>${reply.commentWriter}: ${reply.commentText}</p>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `;
                        commentSection.append(commentHtml);
                    });
                } else {
                    commentSection.append('<p class="no-comments">댓글이 없습니다.</p>');
                }
            },
            error: function(xhr, status, error) {
                console.error('댓글 조회 중 오류가 발생했습니다:', xhr.responseText);
            }
        });
    }
});

$("#like").click(function () {
    let ChkLike = $('#like-icon');
    if (ChkLike.hasClass("bi-heart")) { /* 빈 하트 */
        ChkLike.removeClass("bi-heart");
        ChkLike.addClass("bi-heart-fill");
    } else { /* 채운 하트 */
        ChkLike.removeClass("bi-heart-fill");
        ChkLike.addClass("bi-heart");
    };
});
