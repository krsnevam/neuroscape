import type { LabIndustry, PictureKey } from './labs'

/**
 * Plain-language help for the Model Factory stations, keyed by station id:
 * the sentence to remember, a key to every mark on the scene, and how the idea is used at work.
 */
export const factoryExplain: Record<string, { takeaway: string; picture: PictureKey[]; industry: LabIndustry }> = {
  traffic: {
    takeaway: 'A network can only know the situations its data contains. Check what the data leaves out before you trust any error number.',
    picture: [
      { mark: 'Road strip at the top', meaning: 'Cars crawl at the real speed for the hour you are asking about. Busier hour, more cars, slower.' },
      { mark: 'Grey dots', meaning: 'Every real trip that happened: what the network should ideally learn.', color: '#64748b' },
      { mark: 'Blue dots', meaning: 'Trips in the training set. The only ones that change the weights.', color: '#38bdf8' },
      { mark: 'Amber dots', meaning: 'Validation trips, held back to decide when to stop training.', color: '#fbbf24' },
      { mark: 'Rose dots', meaning: 'Test trips, used once at the end to estimate real-world error.', color: '#fb7185' },
      { mark: 'Light blue band', meaning: 'The hours you chose to survey. Trips outside it can never be sampled.' },
      { mark: 'Violet curve', meaning: 'The network’s answer for every hour of the day.', color: '#a78bfa' },
      { mark: 'White and violet dots on the vertical line', meaning: 'Reality and the network’s answer at the hour you are asking about.' },
    ],
    industry: {
      setting: 'Food delivery and cab apps, delivery-time (ETA) team',
      problem: 'Every order shows "arrives in 32 minutes". If that promise is often wrong, customers cancel and riders are paid for idle time.',
      howUsed:
        'The team logs every trip with its time, place, weather and outcome. Before training they check coverage: enough trips from every hour, area, weekday and weekend, rain and dry days. They split by date, training on past weeks and testing on the most recent week, because that is how the model will be used.',
      goesWrong:
        'A model trained mostly on weekday data gives confident but wrong times on festival days and during sudden rain. Teams catch this by reporting error separately for each hour, area and day type, not one overall number, and by collecting data for the missing cases.',
      roles: 'Data engineer (collects and cleans the logs), data scientist (designs the sample and split), ML engineer (trains and deploys the model).',
    },
  },
  sensor: {
    takeaway: 'Scale inputs to a small range before training. Raw numbers in the hundreds push sigmoid neurons flat, and a flat neuron cannot learn.',
    picture: [
      { mark: 'Thick grey curve', meaning: 'How the thermistor really responds: pin reading against true temperature. It bends sharply at the hot end.', color: '#64748b' },
      { mark: 'Orange dots', meaning: 'Calibration points you recorded: a pin reading paired with the true temperature.', color: '#fb923c' },
      { mark: 'Dashed grey line', meaning: 'The best straight line through your points: the simple calibration a beginner would use.' },
      { mark: 'Violet curve', meaning: 'The network’s calibration. It should follow the grey curve.', color: '#a78bfa' },
      { mark: 'Vertical line with two dots', meaning: 'The live reading on pin A0. White dot is the true temperature, violet dot is the network’s estimate.' },
      { mark: 'Bars at the bottom right', meaning: 'One bar per hidden neuron. Green is working normally; red is saturated and no longer learning.', color: '#34d399' },
      { mark: 'Serial monitor', meaning: 'What you would see printed on a laptop connected to the Arduino.' },
    ],
    industry: {
      setting: 'Electronics and IoT manufacturers, firmware and calibration team',
      problem: 'Cheap sensors (temperature, gas, load cells, soil moisture) give readings that are curved and differ slightly from unit to unit. Expensive sensors are accurate but too costly for a ₹500 product.',
      howUsed:
        'On the production line each sensor is read at a few known reference points. A small network or fitted curve is trained on those points, with inputs scaled first, and its handful of weights is stored in the device’s memory. The device then converts every raw reading itself, with no internet.',
      goesWrong:
        'Calibration done only at room temperature fails in a hot factory or a cold storage room, because that is outside the calibrated range. Teams calibrate across the full working range and recheck units after months in the field, because sensors drift as they age.',
      roles: 'Embedded firmware engineer, test and calibration engineer, quality engineer.',
    },
  },
  valley: {
    takeaway: 'Training is rolling downhill on an error landscape. The learning rate sets the step size: too small crawls, too large flies off.',
    picture: [
      { mark: 'Coloured surface', meaning: 'The error for every possible weight w and bias b. Height and colour both mean error: blue is low, yellow is high.' },
      { mark: 'White pin', meaning: 'The lowest point found by checking the whole surface: the best possible weights.' },
      { mark: 'Blue ball and trail', meaning: 'Steepest descent: a step straight downhill each iteration.', color: '#38bdf8' },
      { mark: 'Amber ball and trail', meaning: 'Steepest descent with momentum: keeps part of its previous step, like a heavy ball.', color: '#fbbf24' },
      { mark: 'Pink ball and trail', meaning: 'Levenberg-Marquardt: also measures how curved the ground is and aims for the bottom.', color: '#f472b6' },
      { mark: '"Left the map" in the list', meaning: 'That ball’s steps grew larger every time until the weights became meaningless: training diverged.' },
      { mark: 'Starting weights view, top chart', meaning: 'Quiz marks against hours of sleep for 40 students. Blue dots train the network, amber dots validate it, and the yellow curve is the 1-6-1 network’s output.', color: '#fde047' },
      { mark: 'Starting weights view, middle strip', meaning: 'The output of each of the six hidden neurons across the same hours. One visible curve means the six are copies; a flat line at 0 means they are switched off.' },
      { mark: 'Starting weights view, bottom chart', meaning: 'Training error (blue) and validation error (amber) in marks as iterations pass. The green dashed line marks the lowest validation error; the caption says why training stopped.', color: '#34d399' },
    ],
    industry: {
      setting: 'Any company that trains models: speech, search, recommendations, credit scoring',
      problem: 'Training a large model can take days on expensive hardware. A run that diverges or crawls wastes that time and money.',
      howUsed:
        'Engineers choose an optimiser (almost always gradient descent with momentum or a close variant), start with a small learning rate, and watch the training loss curve live on a dashboard. If the loss shoots up they stop the run and lower the learning rate. Many teams raise the rate gradually at the start and lower it towards the end.',
      goesWrong:
        'The most common failure is a loss that suddenly becomes "NaN" (not a number) because the learning rate was too high. Teams keep regular checkpoints so they can restart from just before the failure instead of from the beginning.',
      roles: 'ML engineer, research engineer, MLOps engineer (runs the training infrastructure).',
    },
  },
  fraud: {
    takeaway: 'High accuracy can hide a useless model when one class is rare. Judge it with the confusion matrix and choose the threshold from the cost of each mistake.',
    picture: [
      { mark: 'Grey dots', meaning: 'Genuine payments, placed by amount (across) and time of day (up).', color: '#94a3b8' },
      { mark: 'Red dots with a white ring', meaning: 'Fraud the alarm caught.', color: '#fb7185' },
      { mark: 'Red dots with a pulsing red ring', meaning: 'Fraud that slipped through: money lost.' },
      { mark: 'Amber squares', meaning: 'Genuine payments the alarm blocked: annoyed customers.', color: '#fbbf24' },
      { mark: 'Red shaded area', meaning: 'Where the network’s score is above your threshold, so the alarm rings.' },
      { mark: 'ROC box, violet curve', meaning: 'Every possible threshold at once: share of fraud caught against share of genuine payments blocked.', color: '#a78bfa' },
      { mark: 'White dot on the ROC curve', meaning: 'Where your current threshold sits on that curve.' },
      { mark: 'Dashed diagonal', meaning: 'What random guessing would achieve. The further above it, the better.' },
    ],
    industry: {
      setting: 'Banks, UPI apps and payment processors, fraud risk team',
      problem: 'Out of millions of daily payments a tiny share is fraud. Missing fraud loses money and trust; blocking genuine payments loses customers.',
      howUsed:
        'Every payment is scored by a model in a few milliseconds before it is approved. The team does not report accuracy. They track fraud caught, false alarms per thousand payments and money saved, and they pick the threshold with business and operations teams. High-risk payments are sent for a one-time password or a manual review instead of an outright block.',
      goesWrong:
        'Fraudsters change tactics within weeks, so a model that was excellent last quarter starts missing a new pattern. Teams retrain regularly on recent labelled cases and keep simple rules alongside the model for patterns that appear suddenly.',
      roles: 'Fraud data scientist, risk analyst, ML engineer, fraud operations investigator.',
    },
  },
  battery: {
    takeaway: 'A low training error proves nothing on its own. Overfitting shows as a gap between training and validation error; extrapolation is cured only by data.',
    picture: [
      { mark: 'Blue dots', meaning: 'Battery readings used for training.', color: '#38bdf8' },
      { mark: 'Amber dots', meaning: 'Readings held back for validation. The network never trains on them.', color: '#fbbf24' },
      { mark: 'Yellow curve', meaning: 'The network’s prediction of battery level for every hour.', color: '#fde047' },
      { mark: 'Red shaded stretches, dashed red curve', meaning: 'Hours with no training reading within 1 hour. The novelty check marks the curve there as "outside training data: do not trust".', color: '#f87171' },
      { mark: 'Dot on a dotted vertical line', meaning: 'The hour you asked about with "Battery at hour". Green: inside the training data. Red: flagged as new territory.', color: '#34d399' },
      { mark: 'Regression plot', meaning: 'Each dot is one reading: measured battery across, network output up. Dashed line: perfect fit a = t. Solid lines: best straight line through the training (blue) and validation (amber) dots, with R.' },
      { mark: 'Red line at 0%', meaning: 'Where the curve crosses it is the predicted time the phone dies.' },
      { mark: 'Small chart, blue and amber lines', meaning: 'Training and validation error while it trains. When amber turns up while blue keeps falling, it is overfitting.' },
      { mark: 'Green dashed line in the small chart', meaning: 'The moment validation error was lowest: where early stopping would keep the weights.', color: '#34d399' },
    ],
    industry: {
      setting: 'Phone and electric-vehicle makers, battery and range estimation team',
      problem: 'Users plan their day or a drive around "4 h 20 min left" or "212 km range". A confident wrong number strands people.',
      howUsed:
        'Models are trained on millions of logged discharge curves across ages of battery, temperatures and usage styles. They hold back whole users or whole vehicles for validation, so the model is judged on batteries it has never seen. Early stopping and regularisation keep the curves smooth.',
      goesWrong:
        'Range predictions are worst in situations rare in the training data, such as very cold mornings or a new app that drains power unusually. Teams flag predictions as low-confidence when the inputs are outside the usual range, and add logs from those situations to the next training round.',
      roles: 'Data scientist, battery systems engineer, ML engineer.',
    },
  },
  cricket: {
    takeaway: 'Train on yes or no outcomes and the network’s output becomes a probability: the average outcome for each situation.',
    picture: [
      { mark: 'Floor', meaning: 'Where losses land. A loss has target 0.' },
      { mark: 'Top plane', meaning: 'Where wins land. A win has target 1.' },
      { mark: 'Red and green dots', meaning: 'Finished matches: red is a loss on the floor, green is a win on the top plane.', color: '#4ade80' },
      { mark: 'Coloured surface', meaning: 'The network’s output: the chance of winning for every situation. Red is low, green is high.' },
      { mark: 'White pin, ball and label', meaning: 'Your chosen situation and the chance the network gives it.' },
      { mark: 'Axes', meaning: 'Runs needed (across) and balls left (into the screen).' },
    ],
    industry: {
      setting: 'Sports broadcasters, weather services and lenders, forecasting teams',
      problem: 'Viewers, travellers and lenders want a single honest number: how likely is this to happen?',
      howUsed:
        'Broadcasters train win-probability models on ball-by-ball records of past matches, with the situation as input and the final result as a 0 or 1 target. Weather services do the same with past days that did or did not have rain. The output is then checked for calibration: of all the times it said 30%, did the event happen about 30% of the time?',
      goesWrong:
        'A model can rank situations correctly yet be overconfident, saying 90% when the truth is 70%. Teams plot predicted against observed frequencies and adjust. Rule changes (such as a new impact-player rule) make old data less representative, so models are retrained each season.',
      roles: 'Sports data analyst, data scientist, forecaster.',
    },
  },
  doodle: {
    takeaway: 'Good preprocessing does most of the work in recognition. Make the input look the same whenever the thing is the same.',
    picture: [
      { mark: 'Drawing pad', meaning: 'Draw here with a finger or mouse. The grid shows how the pad is cut into 64 cells.' },
      { mark: '"What the network sees"', meaning: 'Your drawing reduced to 64 cells, on or off. These 64 numbers are the whole input.' },
      { mark: 'Three bars', meaning: 'The network’s probabilities for circle, cross and tick. They always add up to 100%.' },
      { mark: 'Small tiles on the right', meaning: 'Every training example, shown exactly as the network sees it.' },
    ],
    industry: {
      setting: 'Banks, post offices, phone keyboards and smartwatches',
      problem: 'Handwritten cheques, PIN codes, forms in many scripts, and finger gestures must be read automatically, quickly and cheaply.',
      howUsed:
        'Scans are cleaned first: straightened, cropped to the ink, scaled to a fixed size and turned to black and white. Only then does a recognition network see them, trained on many writers’ examples of each character, with probabilities for each class. Low-confidence results go to a human.',
      goesWrong:
        'Systems trained on one population’s handwriting perform worse on another, for example on a regional script or on elderly users. Teams collect examples from the people who will actually use the system, and track accuracy separately for each group.',
      roles: 'Computer vision engineer, data annotation lead, product engineer.',
    },
  },
  colours: {
    takeaway: 'A self-organising map finds groups with no labels at all, and neighbouring neurons end up holding similar things.',
    picture: [
      { mark: 'Wire cube', meaning: 'Colour space: red increases to the right, green upwards, blue towards you.' },
      { mark: 'Small dots', meaning: 'Pixels from the picture, each placed at its own colour.' },
      { mark: 'Coloured balls joined by white lines', meaning: 'The 64 neurons. Each ball sits at the colour it has learned; lines join grid neighbours.' },
      { mark: 'Palette at the bottom left', meaning: 'The same 64 neurons laid out on their 8 × 8 grid. Similar colours sit next to each other.' },
      { mark: '× on the palette', meaning: 'A dead neuron: it has not won a single pixel.' },
      { mark: 'Distance map (grey grid)', meaning: 'Light cell: this neuron’s colour is close to its neighbours’. Dark cell: far from them, a border between two clusters.' },
      { mark: 'Hits (blue grid with numbers)', meaning: 'How many pixels each neuron wins. Brighter means more. 0 is a dead neuron.', color: '#38bdf8' },
      { mark: 'Weight planes (three small grids)', meaning: 'The red, green and blue weight of every neuron, one grid per input. Bright means a large weight for that input.' },
    ],
    industry: {
      setting: 'Retail, telecom and manufacturing, analytics and monitoring teams',
      problem: 'There is a lot of data and no labels: who are our kinds of customers, what does normal machine behaviour look like?',
      howUsed:
        'Retailers map shoppers by what they buy and how often, then look at each region of the map and give it a name ("weekend family shoppers"). Factories train a map on readings from healthy machines; a new reading that lands far from every neuron is flagged for inspection. Image tools use the same idea to reduce a photo to a small palette.',
      goesWrong:
        'The groups a map finds are not automatically meaningful; they depend on which inputs were included and how they were scaled. Teams normalise every input, try several map sizes, and have a domain expert review the groups before anyone acts on them.',
      roles: 'Data scientist, business analyst, reliability engineer.',
    },
  },
  wave: {
    takeaway: 'Prediction uses the recent past to guess what comes next. Errors grow every step you look further ahead.',
    picture: [
      { mark: 'White line', meaning: 'What actually happened: your finger, the phone tilt, or the demo wave.', color: '#f8fafc' },
      { mark: 'Vertical line', meaning: 'Now. Everything to its right is the future.' },
      { mark: 'Amber dots to the right', meaning: 'The network’s forecast for the next two seconds, each step built on the previous guess.', color: '#fbbf24' },
      { mark: 'Orange or green line', meaning: 'What the network predicted earlier for each moment, so you can compare it with what happened.', color: '#f59e0b' },
      { mark: 'Bars at the bottom left', meaning: 'Error autocorrelation. Bars inside the red dashed limits (green) mean no pattern is left in the errors.', color: '#34d399' },
      { mark: 'Second set of bars', meaning: 'Input-error cross-correlation: how much the errors follow the input 1 to 12 steps earlier. Red bars mean the input holds information the network has not used.', color: '#f87171' },
      { mark: 'Beat the model: white line with dots', meaning: 'Hourly load in kW on a campus feeder over the last two days. Labels below show the day and hour.', color: '#f8fafc' },
      { mark: 'Beat the model: yellow column', meaning: 'The next hour. Blue dot: your guess. Amber dot: the network’s forecast. White dot: what actually happened.', color: '#38bdf8' },
    ],
    industry: {
      setting: 'Electricity grids, logistics and stock control, forecasting teams',
      problem: 'Power stations must be scheduled hours ahead, and warehouses must order stock weeks ahead, from patterns in recent demand.',
      howUsed:
        'Grid operators predict the next day’s demand from the last weeks of readings plus calendar and weather inputs, using a window of past values like the delays here. They compare forecast errors against simple baselines (such as "same as this time yesterday") and check that the remaining errors have no pattern.',
      goesWrong:
        'Forecasts break during events the past does not contain, such as a lockdown or a heatwave far beyond earlier ones. Teams monitor forecast error daily and switch to manual planning or a simpler model when it jumps.',
      roles: 'Demand forecaster, data scientist, grid or supply-chain planner.',
    },
  },
}
