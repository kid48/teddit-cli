#!/usr/bin/env node

import axios from "axios";
import blessed from "blessed";
import {convert} from 'html-to-text';
import he from 'he';

const subreddit = process.argv[2] ? process.argv[2] : 'Privacy';

const removeNonStandardTags = (text) => {
    text = text.replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<div class="md">/g, '')
        .replace(/<\/div>/g, '')
        .replace(/<p>/g, '')
        .replace(/<\/p>/g, '\n')
        .replace(/<a[^>]*>(.*?)<\/a>/g, '$1');

    return he.decode(text)
}

// Create a screen object.
var screen = blessed.screen({
    smartCSR: true
});

screen.title = 'Teddit CLI';

// Create a box to display the list of posts.
var list = blessed.list({
    top: 0,
    left: 0,
    width: '40%',
    height: '100%',
    items: ['Loading...'],
    keys: true,
    vi: true,
    mouse: true,
    style: {
        selected: {
            bg: 'blue'
        }
    }
});

// Create a box to display the selected post.
var box = blessed.box({
    top: 0,
    left: '40%',
    width: '60%',
    height: '50%',
    content: '',
    tags: true,
    border: {
        type: 'line'
    },
    style: {
        fg: 'white',
        bg: 'black',
        border: {
            fg: '#f0f0f0'
        }
    }
});
var comments = blessed.box({
    top: '50%',
    left: '40%',
    width: '60%',
    height: '100%',
    content: '',
    tags: true,
    border: {
        type: 'line'
    },
    style: {
        fg: 'white',
        bg: 'black',
        border: {
            fg: '#f0f0f0'
        }
    }
});

// Append our boxes to the screen.
screen.append(list);
screen.append(box);
screen.append(comments);

// Quit on Escape, q, or Control-C.
screen.key(['escape', 'q', 'C-c'], function (ch, key) {
    return process.exit(0);
});

// Fetch posts from Teddit.
const teddit_instance = "https://teddit.pussthecat.org"
axios.get(`${teddit_instance}/r/${subreddit}?api`)
    .then(function (response) {
        const postsObject = response.data.links;
        const postsArray = Object.entries(postsObject).map(([key, value]) => {
            return {key, value};
        });

        // Update the list items with the post titles.
        list.setItems(postsArray.map(post => post.value.title));
        screen.render();

        // Display the selected post when a list item is selected.
        list.on('select', function (item, index) {
            const chosenPost = postsArray[index];
            const title = chosenPost.value.title;
            const text = chosenPost.value.selftext_html ? removeNonStandardTags(convert(chosenPost.value.selftext_html, {wordwrap: 130})) + "\n" : "";
            const author = chosenPost.value.author;
            const url = chosenPost.value.url && !chosenPost.value.url.includes('teddit.net') ? chosenPost.value.url : "";
            box.setContent(`Title: ${title}\nAuthor: ${author}\n\n${text}${url}`);
            comments.content = '';
            get_comments(chosenPost.value.id);

            screen.render();
        });
    })
    .catch(function (error) {
        // Update the list items with the error message.
        list.setItems(['Error: ' + error.message]);
        screen.render();
    });

async function get_comments(post_id) {
    const response = await axios.get(`https://teddit.net/r/privacy/comments/${post_id}?api`);
    const commentsObject = response.data.comments;

    if (commentsObject) {
        display_comments(commentsObject);
    } else {
        comments.content = "No comments.";
        screen.render();
    }
}

function display_comments(comments, depth = 0) {
    const padding = ' '.repeat(depth * 2);
    for (const comment of comments) {
        const formattedComment = `${removeNonStandardTags(convert(comment.body_html, {wordwrap: 130}))}`;
        comments.content += "\n\n" + padding + formattedComment;
        if (comment.replies && comment.replies.length > 0) {
            display_comments(comment.replies, depth + 1);
        }
    }
    screen.render();
}

// Focus our list.
list.focus();

