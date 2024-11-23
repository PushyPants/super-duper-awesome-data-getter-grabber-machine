const puppeteer = require('puppeteer');
const fs = require('fs');

// Helper function to sleep for random duration
const randomSleep = async () => {
    const sleepTime = Math.random() * 6000; // Random time between 0-6 seconds
    await new Promise(resolve => setTimeout(resolve, sleepTime));
};

async function scrapeMuscleGroups() {
    const browser = await puppeteer.launch({
        // headless: false, // Makes the browser visible
        // defaultViewport: null, // Allows the viewport to be full size
    });
    const page = await browser.newPage();
    
    // await randomSleep();
    await page.goto('https://www.muscleandstrength.com/exercises/');
    // await randomSleep();

    const muscleGroupData = {};

    // Get all muscle group links from main page
    const muscleGroupLinks = await page.$$eval(
        '.mainpage-category-list.exercise-category-list:first-of-type .grid-x .cell',
        cells => cells.map(cell => {
            const img = cell.querySelector('a img');
            const imageUrl = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-original');
            const name = cell.querySelector('.category-name').textContent.trim();
            const url = cell.querySelector('a').href;
            return { name, url, imageUrl };
        })
    );
    

    // for (const muscleGroup of muscleGroupLinks) {
    //     await randomSleep();
    //     muscleGroupData[muscleGroup.name] = {
    //         name: muscleGroup.name,
    //         imageUrl: '', // Will be populated from exercise page
    //         exercises: []
    //     };

    //     await scrapeExercisesForMuscleGroup(page, muscleGroup.url, muscleGroupData[muscleGroup.name]);
    // }

    // await browser.close();

    // // Save to file
    // fs.writeFileSync('musclefitnessdata.json', JSON.stringify(muscleGroupData, null, 2));
}

async function scrapeExercisesForMuscleGroup(page, muscleGroupUrl, muscleGroupData) {
    await randomSleep();
    await page.goto(muscleGroupUrl);
    await randomSleep();

    let hasNextPage = true;
    while (hasNextPage) {
        // Get all exercise links on current page
        const exerciseLinks = await page.$$eval('a[href*="/exercise/"]', links =>
            links.map(link => link.href)
        );

        for (const exerciseUrl of exerciseLinks) {
            await randomSleep();
            const exerciseData = await scrapeExerciseData(page, exerciseUrl);
            muscleGroupData.exercises.push(exerciseData);
        }

        // Check for next page
        const nextButton = await page.$('a[title="Go to next page"]');
        if (nextButton) {
            await randomSleep();
            await nextButton.click();
            await page.waitForNavigation();
            await randomSleep();
        } else {
            hasNextPage = false;
        }
    }
}

async function scrapeExerciseData(page, exerciseUrl) {
    await randomSleep();
    await page.goto(exerciseUrl);
    await randomSleep();

    const exerciseData = {
        name: await page.$eval('h1', h1 => h1.textContent.trim()),
        imageUrl: await page.$eval('img.exercise-image', img => img.src),
        videoUrl: await page.$eval('video source', source => source.src).catch(() => ''),
        exerciseProfile: [],
        targetMuscleGroup: {},
        instructions: [],
        tips: []
    };

    await randomSleep();

    // Get exercise profile
    const profileItems = await page.$$('ul.exercise-info li');
    for (const item of profileItems) {
        await randomSleep();
        const label = await item.$eval('.row-label', span => span.textContent.trim());
        const value = await item.$eval('.field', div => div.textContent.trim());
        exerciseData.exerciseProfile.push({ label, value });
    }

    await randomSleep();

    // Get target muscle group
    const targetMuscles = await page.$('.target-muscles');
    if (targetMuscles) {
        await randomSleep();
        exerciseData.targetMuscleGroup = {
            name: await targetMuscles.$eval('h3', h3 => h3.textContent.trim()),
            imageUrl: await targetMuscles.$eval('img', img => img.src)
        };
    }

    await randomSleep();

    // Get instructions
    const instructions = await page.$$eval('div.field > div.field-items > div.field-item > ol > li', 
        lis => lis.map(li => li.textContent.trim())
    );
    exerciseData.instructions = instructions;

    await randomSleep();

    // Get tips if they exist
    const tipsHeader = await page.$('h3:contains("tips")');
    if (tipsHeader) {
        await randomSleep();
        const tips = await page.$$eval('h3:contains("tips") + ol > li',
            lis => lis.map(li => li.textContent.trim())
        );
        exerciseData.tips = tips;
    }

    return exerciseData;
}

scrapeMuscleGroups().catch(console.error);

