#!/usr/bin/env node

import inquirer from "inquirer";
import {createSpinner} from "nanospinner";
import figlet from 'figlet';
import axios from "axios";
import boxen from "boxen";
import {convert} from 'html-to-text';
import chalk from "chalk";
import he from 'he';
import terminalImage from 'terminal-image';
import got from 'got';


const subreddit = process.argv[2] ? process.argv[2] : 'Privacy' ;

const sleep = (ms = 2000) => new Promise((r) => setTimeout(r, ms))

const removeNonStandardTags = (text) => {
    text =  text.replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<div class="md">/g, '')
        .replace(/<\/div>/g, '')
        .replace(/<p>/g, '\n')
        .replace(/<\/p>/g, '\n')
        .replace(/<a[^>]*>(.*?)<\/a>/g, '$1');

    return he.decode(text)
}


async function welcome() {
    console.log(
        figlet.textSync("Teddit CLI", {
            font: "Larry 3D 2",
            horizontalLayout: "default",
            verticalLayout: "default",
            width: 100,
            whitespaceBreak: true,

        })
    );

    await sleep();

}

async function get_post() {
    const spinner = createSpinner('Loading posts... ').start();
    const response = await axios.get(`https://teddit.net/r/${subreddit}?api`);
    spinner.success({text: 'Posts loaded'});
    const postsObject = response.data.links;


    const postsArray = Object.entries(postsObject).map(([key, value]) => {
        return {key, value};
    });
    //console.log(postsArray);
    const postChoices = postsArray.map((post, index) => {
        return {
            name: post.value.title, value: index
        };
    });


    const {selectedPost} = await inquirer.prompt([
        {
            type: 'list',
            name: 'selectedPost',
            message: 'Choose a post:',
            choices: postChoices
        }
    ]);

    const chosenPost = postsArray[selectedPost];


    const title = chosenPost.value.title;
    const text = chosenPost.value.selftext_html ? removeNonStandardTags(convert(chosenPost.value.selftext_html, {wordwrap: 130})) + "\n" : "";
    const author = chosenPost.value.author;
    const url = chosenPost.value.url && chosenPost.value.url.includes('teddit.net') ? chosenPost.value.url : "";
    const image_link = chosenPost.value.images ? await got(chosenPost.value.images.thumb).buffer()  : '';
    const image = image_link ? await terminalImage.buffer(image_link) : '';


    console.log(boxen(title, {title: chalk.blue('u/' + author)}));
    console.log(
        boxen(
             image + "\n"+ text + url , {
                padding: 1,
                borderStyle: 'double'
            }
        )
    );


    await get_comments(chosenPost.value.id);
}

async function get_comments(post_id) {
    const spinner = createSpinner('Loading comments... ').start();
    const response = await axios.get(`https://teddit.net/r/privacy/comments/${post_id}?api`);
    spinner.success({text: 'Comments loaded'});

    const commentsObject = response.data.comments;

    commentsObject ? display_comments(commentsObject) : console.log("Пока нету комментов");

}

function display_comments(comments, depth = 0) {
    const padding = ' '.repeat(depth * 2);
    for (const comment of comments) {
        const formattedComment = `${removeNonStandardTags(convert(comment.body_html, {wordwrap: 130}))}`;
        const boxenOptions = {
            // padding: depth,
            margin: { left: depth*2},
            borderStyle: 'round',
            title: `u/${comment.author}`
        };
        const boxedComment = boxen(formattedComment, boxenOptions);
        console.log(boxedComment);
        if (comment.replies && comment.replies.length > 0) {
            display_comments(comment.replies, depth + 1);
        }
    }
}

console.clear();
await welcome();
await get_post();
