document.addEventListener("DOMContentLoaded", () => {
  const searchLink = document.getElementById("searchLink");
  const listenLink = document.getElementById("listenLink");
  const searchContainer = document.querySelector(".search-container");
  const mainContainer = document.querySelector(".main-container");
  const queueContainer = document.querySelector(".queue");
  const playerContainer = document.querySelector(".player-container");
  let each;

  function geteElement(selector, parent = document) {
    return parent.querySelector(selector);
  }

  function saveToLocalStorage(key, value) {
    localStorage.setItem(key, value);
  }

  function createEl(tag, className = null, textContent = null, value = null) {
    const element = document.createElement(tag);
    element.className = className;
    element.innerHTML = textContent;
    element.value = value;

    return element;
  }

  const searchInput = geteElement("#searchInput");
  const searchHistory = geteElement("#searchHistory");
  const searchButton = geteElement("#searchButton");
  const resetButton = geteElement("#resetButton");

  let currentPage = 1;
  let currentEpisodePage = 1;
  const rowsPerPage = 10;
  let totalNumberOfPages;
  let totalNumberOfEpisodePages;
  let dataArray = [];
  let queueArray = [];
  let episodeArray = [];
  let currentSearchValue = "";
  let initialLoad = rowsPerPage;

  let feed, maxNo;

  let searchHistoryList = new Set();

  searchLink.addEventListener("click", navigationToSearch);
  listenLink.addEventListener("click", navigationToPlayer);

  function navigationToSearch() {
    searchContainer.style.display = "flex";
    mainContainer.style.display = "flex";
    playerContainer.style.display = "none";
    queueContainer.style.display = "none";
    searchLink.classList.add("selected");
    listenLink.classList.remove("selected");
    localStorage.setItem("page", "search");
  }

  function navigationToPlayer() {
    searchContainer.style.display = "none";
    mainContainer.style.display = "none";
    playerContainer.style.display = "flex";
    queueContainer.style.display = "flex";
    searchLink.classList.remove("selected");
    listenLink.classList.add("selected");
    localStorage.setItem("page", "listen");
  }

  function formateDate(date) {
    const d = new Date(date);

    return `Newest Episode:${d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`;
  }

  //?EVENNT LISTENERS

  searchInput.addEventListener("focus", (e) => {
    searchInput.value = "";
  });
  searchInput.addEventListener("blur", (e) => {
    if (!searchInput.value) {
      const dataFromLS = JSON.parse(localStorage.getItem("searchHistory"));
      searchInput.value = dataFromLS[dataFromLS.length - 1];
    }
  });

  searchInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") {
      if (searchInput.value === "") return;
      dataArray = [];
      currentPage = 1;
      currentSearchValue = searchInput.value;
      if (searchHistoryList.has(currentSearchValue)) {
        checkHistory(currentSearchValue);
      }
      searchHistoryList.add(currentSearchValue);
      saveToLocalStorage(
        "searchHistory",
        JSON.stringify([...searchHistoryList])
      );
      renderHistory();
      searchPodcast(currentSearchValue);
    }
  });

  searchButton.addEventListener("click", (e) => {
    const searchValue = searchInput.value;
    if (searchValue) {
      if (searchHistoryList.has(searchValue)) {
        checkHistory(searchValue);
      }
      searchHistoryList.add(searchValue);
      saveToLocalStorage(
        "searchHistory",
        JSON.stringify([...searchHistoryList])
      );
      dataArray = [];
      currentPage = 1;
      currentSearchValue = searchValue;
      searchPodcast(currentSearchValue);
      renderHistory();
    }
  });

  searchHistory.addEventListener("change", (e) => {
    const selectedValue = e.target.value;
    searchInput.value = selectedValue;
    dataArray = [];
    currentPage = 1;
    currentSearchValue = selectedValue;
    console.log(currentSearchValue);
    searchPodcast(currentSearchValue);
    e.target.value = "";
  });

  resetButton.addEventListener("click", clearHistory);

  //!------------------FUNCTIONS------------------!

  function checkHistory(searchValue) {
    const dataFromLS = JSON.parse(localStorage.getItem("searchHistory"));
    searchHistoryList = new Set(dataFromLS);
    if (searchHistoryList.has(searchValue)) {
      searchHistoryList.delete(searchValue);
      saveToLocalStorage(
        "searchHistory",
        JSON.stringify([...searchHistoryList])
      );
    }
  }

  function renderHistory() {
    searchHistory.innerHTML = ` <option value="">Select a previous search</option>`;
    const dataFromLS = JSON.parse(localStorage.getItem("searchHistory")) || [];

    searchHistoryList = new Set(dataFromLS.slice(0, 10));
    searchHistoryList.forEach((history) => {
      const historyItem = document.createElement("option");
      historyItem.value = history;
      historyItem.textContent = history;
      historyItem.classList.add("history-item");
      searchHistory.appendChild(historyItem);
    });
  }

  function clearHistory() {
    searchHistoryList = new Set();
    saveToLocalStorage("searchHistory", JSON.stringify([...searchHistoryList]));
    renderHistory();
    geteElement("#cardsContainer").innerHTML = "";
    searchInput.value = "";
  }

  //? Pagination functions

  function nextPage() {
    if (currentPage === totalNumberOfPages || currentSearchValue === "") {
      return;
    }
    currentPage++;

    searchPodcast(currentSearchValue);
  }
  function prevPage() {
    if (currentPage === 1 || currentSearchValue === "") return;
    currentPage--;
    console.log("currentPage", currentPage);
    // memoizedSearch(currentSearchValue).then((data) => {
    //   displayPodcast(data);
    // });
    searchPodcast(currentSearchValue);
  }

  geteElement("#prev-btn").addEventListener("click", prevPage);
  geteElement("#next-btn").addEventListener("click", nextPage);

  function handlingDefaultPodcast(img) {
    const fallBack = "./Podcast_01_generated.jpg";
    img.src = fallBack;
    return img;
  }

  function handleImageLoad(limit) {
    let images = geteElement("#cardsContainer").getElementsByTagName("img");
    let imagesToLoad = Math.min(images.length, limit);
    if (images.length === 0) {
      geteElement(".loader-container").style.display = "none";
      geteElement("body").style.pointerEvents = "auto";
      return;
    }
    Array.from(images)
      .slice(0, imagesToLoad)
      .forEach((image) => {
        image.onload = image.onerror = () => {
          imagesToLoad--;
          if (image.complete && !image.naturalWidth) {
            image.src = handlingDefaultPodcast(image);
          }

          if (imagesToLoad === 0) {
            geteElement(".loader-container").style.display = "none";
            geteElement("body").style.pointerEvents = "auto";
            lazyLoadAfterInitialLoad(limit);
          }
        };
      });
  }

  function lazyLoadAfterInitialLoad(start) {
    const remainingImages = Array.from(
      geteElement("#cardsContainer").getElementsByTagName("img")
    ).slice(start);

    const lazyLoadObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          let img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.onload = img.onerror = () => {
              if (img.complete && !img.naturalWidth) {
                img.src = handlingDefaultPodcast(img);
              }
              observer.unobserve(img);
            };
          } else {
            img.src = handlingDefaultPodcast(img);
            observer.unobserve(img);
          }
        }
      });
    });

    remainingImages.forEach((img) => {
      lazyLoadObserver.observe(img);
    });
  }

  async function searchPodcast(key) {
    if (!key) {
      geteElement("#cardsContainer").innerHTML = "Please enter podcast!";
      return;
    }
    try {
      geteElement("#cardsContainer").scrollTo({
        top: 0,
        behavior: "smooth",
      });
      if (dataArray.length > 0) {
        const paginated = paginate(dataArray);
        geteElement("#cardsContainer").innerHTML = "";
        paginated.forEach((card, index) => {
          const c = createCard(card);
          geteElement("#cardsContainer").appendChild(c);

          if (index >= initialLoad) {
            card.querySelector("img").dataset.src =
              card.querySelector("img").src;
            card.querySelector("img").src = "";
          }

          handleImageLoad(initialLoad);
        });
        geteElement("#cardsContainer").appendChild(createPagination());
        return;
      }
      geteElement(".loader-container").style.display = "block flex";
      geteElement("body").style.pointerEvents = "none";

      const response = await fetch(
        `https://podplayer-1.onrender.com/api/search?q=${encodeURIComponent(
          key
        )}`
      );
      const data = await response.json();
      if (!data.feeds) {
        geteElement("#cardsContainer").innerHTML = "No podcast found!";
        return;
      }
      dataArray = data.feeds;
      totalNumberOfPages = Math.ceil(dataArray.length / rowsPerPage);
      currentEpisodePage = 1;
      currentPage = 1;
      dataArray = dataArray.filter((item) => item.itunesId !== null);

      dataArray = dataArray.map((podcast) => {
        return {
          title: podcast.title,
          description: podcast.description,
          image: podcast.image,
          newestItemPubdate: podcast.newestItemPubdate,
          itunesId: podcast.itunesId,
          episodeCount: podcast.episodeCount,
        };
      });
      const paginated = paginate(dataArray);

      geteElement("#cardsContainer").innerHTML = "";
      paginated.forEach((card, index) => {
        const c = createCard(card);
        geteElement("#cardsContainer").appendChild(c);

        if (index >= initialLoad) {
          card.querySelector("img").dataset.src = card.querySelector("img").src;
          card.querySelector("img").src = "";
        }

        handleImageLoad(initialLoad);
      });

      geteElement("#cardsContainer").appendChild(createPagination());
    } catch (error) {
      console.log(error);
      geteElement(".loader-container").style.display = "none";
      geteElement("body").style.pointerEvents = "auto";
      geteElement("#cardsContainer").innerHTML = `Error: ${error.message}`;
    } finally {
      geteElement(".loader-container").style.display = "none";
      geteElement("body").style.pointerEvents = "auto";
    }
  }

  function createCard(podcast) {
    const card = createEl("div", "card", null, null);
    const cardImgContainer = createEl("div", "card-img-container", null, null);
    const cardImg = createEl("img", null, null, null);
    cardImg.alt = podcast.title;
    cardImg.loading = "lazy";
    cardImg.src = podcast.image || "Podcast_01_generated.jpg";

    const cardContent = createEl("div", "card-content", null, null);
    const podcastTitle = createEl("h3", "podcast-title", podcast.title, null);
    const cardDescription = createEl(
      "p",
      "card-description",
      podcast.description,
      null
    );
    const episodeCount = createEl(
      "p",
      "episode-count",
      `Episode: ${podcast.episodeCount}`,
      null
    );
    const pubDate = createEl(
      "p",
      "pub-date",
      podcast.newestItemPubdate
        ? formateDate(podcast.newestItemPubdate)
        : "Not available",
      null
    );

    cardImgContainer.appendChild(cardImg);
    cardContent.appendChild(podcastTitle);
    cardContent.appendChild(cardDescription);
    cardContent.appendChild(episodeCount);
    cardContent.appendChild(pubDate);

    card.appendChild(cardImgContainer);
    card.appendChild(cardContent);

    card.addEventListener("click", () => {
      episodeArray = [];
      searchEpisodes(podcast.itunesId, podcast.episodeCount);
    });

    return card;
  }

  function createPagination() {
    const pagination = createEl("div", "pagination", null, null);
    const prevBtn = createEl("i", "fas fa-chevron-left", null, null);
    const span = createEl("span", null, currentPage, null);
    const nextBtn = createEl("i", "fas fa-chevron-right", null, null);

    pagination.appendChild(prevBtn);
    pagination.appendChild(span);
    pagination.appendChild(nextBtn);

    prevBtn.addEventListener("click", prevPage);
    nextBtn.addEventListener("click", nextPage);

    return pagination;
  }

  function paginate(podcasts) {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;

    const paginatedPodcasts = podcasts.slice(start, end);

    return paginatedPodcasts;
  }

  async function searchEpisodes(feedId, max) {
    if (!feedId) {
      geteElement("#cardsContainer").innerHTML = "Feedid is required!";
      return;
    }

    try {
      geteElement("#cardsContainer").scrollTo({
        top: 0,
        behavior: "smooth",
      });
      if (episodeArray.length > 0) {
        const paginated = paginateEpisodes(episodeArray);
        geteElement("#cardsContainer").innerHTML = "";
        paginated.forEach((episode, index) => {
          const episodeCard = createEpisodeCard(episode);
          geteElement("#cardsContainer").appendChild(episodeCard);

          if (index >= initialLoad) {
            card.querySelector("img").dataset.src =
              card.querySelector("img").src;
            card.querySelector("img").src = "";
          }

          handleImageLoad(initialLoad);
        });
        geteElement("#cardsContainer").appendChild(createEpisodesPagination());
        return;
      }

      geteElement("body").style.pointerEvents = "none";
      geteElement(".loader-container").style.display = "block flex";

      const response = await fetch(
        `https://podplayer-1.onrender.com/api/episodes?feedId=${encodeURIComponent(
          feedId
        )}&max=${max}`
      );
      const data = await response.json();
      if (!data.items) {
        geteElement("#cardsContainer").innerHTML = "No podcast found!";
        return;
      }
      episodeArray = data.items;
      episodeArray.reverse();
      feed = feedId;
      maxNo = max;
      totalNumberOfEpisodePages = Math.ceil(episodeArray.length / rowsPerPage);
      currentEpisodePage = 1;
      currentPage = 1;
      episodeArray = episodeArray.map((episode) => {
        return {
          title: episode.title,
          description: episode.description,
          image: episode.image || episode.feedImage,
          datePublishedPretty: episode.datePublishedPretty,
          audio: episode.enclosureUrl,
        };
      });

      const paginated = paginateEpisodes(episodeArray);
      geteElement("#cardsContainer").innerHTML = "";
      paginated.forEach((episode, index) => {
        const episodeCard = createEpisodeCard(episode);
        geteElement("#cardsContainer").appendChild(episodeCard);

        if (index >= initialLoad) {
          card.querySelector("img").dataset.src = card.querySelector("img").src;
          card.querySelector("img").src = "";
        }

        handleImageLoad(initialLoad);
      });
      geteElement("#cardsContainer").appendChild(createEpisodesPagination());
    } catch (error) {
      console.log(error);
      geteElement(".loader-container").style.display = "none";
      geteElement("body").style.pointerEvents = "auto";
      geteElement("#cardsContainer").innerHTML = `Error: ${error.message}`;
    } finally {
      geteElement(".loader-container").style.display = "none";
      geteElement("body").style.pointerEvents = "auto";
    }
  }

  function createEpisodeCard(episode) {
    const episodes = createEl("div", "card", null, null);
    const episodesImgContainer = createEl(
      "div",
      "card-img-container",
      null,
      null
    );
    const episodesImg = createEl("img", null, null, null);
    episodesImg.src = episode.image;

    const episodesContent = createEl("div", "card-content", null, null);
    const episodesTitle = createEl("h3", "podcast-title", episode.title, null);

    const iconContainer = createEl("div", "episode-icon-container", null, null);
    const playIcon = createEl("i", "play-btn fas fa-play-circle");
    playIcon.addEventListener("click", () => {
      if (playIcon.className === "play-btn fas fa-pause-circle") {
        pausePodcast();
        console.log("what???");
        playIcon.className = "play-btn fas fa-play-circle";
        return;
      }
      playIcon.className = "play-btn fas fa-spinner fa-spin";
      loadPodcast(episode);
      playIcon.className = "play-btn fas fa-pause-circle";
    });

    const addBtn = createEl("i", "add-btn fas fa-list");
    addBtn.addEventListener("click", () => {
      addBtn.classList.add("added-to-queue");
      sendToQueue(episode);
    });

    const episodesDescription = createEl(
      "p",
      "card-description",
      episode.description,
      null
    );
    const pubDate = createEl("p", "pub-date", episode.datePublishedPretty);

    iconContainer.appendChild(playIcon);
    iconContainer.appendChild(addBtn);
    iconContainer.appendChild(pubDate);

    episodesImgContainer.appendChild(episodesImg);
    episodesContent.appendChild(episodesTitle);
    episodesContent.appendChild(iconContainer);
    episodesContent.appendChild(episodesDescription);

    episodes.appendChild(episodesImgContainer);
    episodes.appendChild(episodesContent);

    return episodes;
  }

  function createEpisodesPagination() {
    const pagination = createEl("div", "pagination", null, null);
    const prevBtn = createEl("i", "fas fa-chevron-left", null, null);
    const span = createEl("span", null, currentEpisodePage, null);
    const nextBtn = createEl("i", "fas fa-chevron-right", null, null);

    pagination.appendChild(prevBtn);
    pagination.appendChild(span);
    pagination.appendChild(nextBtn);

    prevBtn.addEventListener("click", prevEpisodes);
    nextBtn.addEventListener("click", nextEpisodes);

    return pagination;
  }

  function paginateEpisodes(podcasts) {
    const start = (currentEpisodePage - 1) * rowsPerPage;
    const end = start + rowsPerPage;

    const paginatedEpisodes = podcasts.slice(start, end);

    return paginatedEpisodes;
  }

  function nextEpisodes() {
    console.log("currentEpisodePage", currentEpisodePage);
    console.log("totalEpisodePage", totalNumberOfEpisodePages);
    if (currentEpisodePage === totalNumberOfEpisodePages) {
      return;
    }
    currentEpisodePage++;

    searchEpisodes(episodeArray);
  }
  function prevEpisodes() {
    if (currentEpisodePage === 1) return;
    currentEpisodePage--;

    searchEpisodes(episodeArray);
  }

  const image = document.querySelector("#player-img");
  const title = document.getElementById("player-title");
  const playerPublishedDate = document.getElementById("player-datePublished");
  const player = document.querySelector("#player");
  const currentTimeEl = document.getElementById("current-time");
  const durationEl = document.getElementById("duration");
  const progress = document.getElementById("progress");
  const progressContainer = document.getElementById("progress-container");
  const prevBtn = document.getElementById("prev");
  const playBtn = document.getElementById("play");
  const nextBtn = document.getElementById("next");

  // Check if Playing
  let isPlaying = false;

  // Play
  function playPodcast() {
    isPlaying = true;
    playBtn.classList.replace("fa-play", "fa-pause");
    playBtn.setAttribute("title", "Pause");
    player.play();
  }

  // Pause
  function pausePodcast() {
    isPlaying = false;
    playBtn.classList.replace("fa-pause", "fa-play");
    playBtn.setAttribute("title", "Play");
    player.pause();
  }

  playBtn.addEventListener("click", () =>
    isPlaying ? pausePodcast() : playPodcast()
  );

  function skipTime(amount) {
    console.log("amount", amount);
    player.currentTime = Math.max(
      0,
      Math.min(player.duration, player.currentTime + amount)
    );
  }

  function loadPodcast(episode) {
    console.log("episode", episode.title);
    let titleArray = episode.title.split(" ");

    if (titleArray.length > 7) {
      for (let i = 0; i < titleArray.length; i++) {
        titleArray[i] = "...";
        titleArray.splice(i, 1);
      }
      titleArray = titleArray.slice(0, 7);
      titleArray.push("...");
      title.textContent = titleArray.join(" ");
    } else {
      title.textContent = episode.title;
    }

    playerPublishedDate.textContent = episode.datePublishedPretty
      ? episode.datePublishedPretty
      : "Not available";
    player.src = episode.audio;
    image.src =
      episode.image || episode.feedImage || "./Podcast_01_generated.jpg";
    player.currentTime = 0;
    progress.classList.add("loading");

    player.addEventListener("loadedmetadata", () => {
      const durationMinutes = player.duration;
      formatTime(durationMinutes, durationEl);
      currentTimeEl.style.display = "block";
      durationEl.style.display = "block";

      progress.classList.remove("loading");
      playPodcast();
    });
  }

  // Current Podcast
  let songIndex = 0;

  function formatTime(time, elName) {
    //calculate minutes seconds
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    let seconds = Math.floor(time % 60);

    //format seconds

    if (seconds < 10) {
      seconds = `0${seconds}`;
    }

    const formatedMin = hours > 0 && minutes < 10 ? `0${minutes}` : minutes;
    if (time) {
      elName.textContent =
        hours > 0
          ? `${hours}:${formatedMin}:${seconds}`
          : `${minutes}:${seconds}`;
    }
  }

  // Update Progress Bar & Time
  function updateProgressBar(e) {
    const { duration, currentTime } = e.srcElement;
    // Update progress bar width
    const progressPercent = (currentTime / duration) * 100;
    progress.style.width = `${progressPercent}%`;

    //?Format time
    formatTime(duration, durationEl);
    formatTime(currentTime, currentTimeEl);
  }

  // Set Progress Bar
  function setProgressBar(e) {
    const width = this.clientWidth;
    const clickX = e.offsetX;
    const { duration } = player;
    player.currentTime = (clickX / width) * duration;
  }

  player.addEventListener("timeupdate", updateProgressBar);
  progressContainer.addEventListener("click", setProgressBar);
  prevBtn.addEventListener("click", () => skipTime(-10));
  nextBtn.addEventListener("click", () => skipTime(10));
  document.addEventListener("keydown", (e) => {
    if (!isPlaying) return;
    if (e.code === "ArrowRight") {
      skipTime(10);
    } else if (e.code === "ArrowLeft") {
      skipTime(-10);
    }
  });

  //?save state to local storage

  setInterval(() => {
    if (isPlaying) {
      const state = {
        title: title.textContent,
        date: playerPublishedDate.textContent,
        audio: player.src,
        image: image.src,
        currentTime: player.currentTime,
        duration: player.duration,
        isPlaying: isPlaying,
      };
      localStorage.setItem("state", JSON.stringify(state));
    }
  }, 2000);

  //!Load player state
  function loadState() {
    const state = JSON.parse(localStorage.getItem("state"));
    if (!state) return;
    title.textContent = state.title;
    playerPublishedDate.textContent = state.date;
    player.src = state.audio;
    image.src = state.image;
    player.currentTime = state.currentTime;
    formatTime(state.currentTime, currentTimeEl);
    player.duration = state.duration;
    formatTime(state.duration, durationEl);
    progress.style.width = `${(state.currentTime / state.duration) * 100}%`;
  }

  loadState();

  function createQueueCard(episode) {
    const queueCard = createEl("div", "queue-item");
    const queueImg = createEl("img");
    queueImg.src = episode.image;
    const queueContent = createEl("div", "queue-content");
    episode.title = episode.title.split(" ").slice(0, 7);
    episode.title.push("...");
    episode.title = episode.title.join(" ");
    const queueTitle = createEl("h3", "queue-title", episode.title);
    const queueIconContainer = createEl("div", "icon-container");
    const queuePlayBtn = createEl("i", "fas fa-play-circle");
    queuePlayBtn.title = "Play Podcast";

    queuePlayBtn.addEventListener("click", () => {
      loadPodcast(episode);
    });

    const queueDeleteBtn = createEl("i", "fas fa-trash-alt");
    queueDeleteBtn.title = "Remove Podcast";

    queueDeleteBtn.addEventListener("click", () =>
      deleteItemsFromQueue(episode)
    );

    queuePlayBtn.addEventListener("click", () => {
      playPodcast(episode);
    });

    queueIconContainer.appendChild(queuePlayBtn);
    queueIconContainer.appendChild(queueDeleteBtn);

    queueContent.appendChild(queueTitle);
    queueContent.appendChild(queueIconContainer);

    queueCard.appendChild(queueImg);
    queueCard.appendChild(queueContent);

    return queueCard;
  }

  function sendToQueue(episode) {
    if (queueArray.includes(episode)) return;
    episodeArray.push(episode);
    const card = createQueueCard(episode);
    geteElement(".queue").appendChild(card);
    saveQueueToLS(episode);
  }

  function deleteItemsFromQueue(episode) {
    const usure = confirm("Are you sure you want to remove this podcast?");
    if (usure) {
      queueArray = queueArray.filter(
        (item) => item.title !== episode.title && item.image !== episode.image
      );

      localStorage.setItem("queue", JSON.stringify(queueArray));

      const items = document.querySelectorAll(".queue-item");

      items.forEach((card) => {
        const title = card.querySelector("h3").textContent;
        const image = card.querySelector("img").src;
        if (title === episode.title && image === episode.image) {
          card.remove();
        }
      });
    }
  }

  function saveQueueToLS(episode) {
    const filtered = queueArray.filter((queue) => {
      return queue !== undefined;
    });
    localStorage.setItem("queue", JSON.stringify(filtered));
  }

  function renderQueueFromLS() {
    const cards = JSON.parse(localStorage.getItem("queue"));
    if (cards) {
      cards.forEach((episode) => {
        queueArray.push(episode);
        if (queueArray.includes(episode)) return;
        sendToQueue(episode);
      });
    }
  }

  renderQueueFromLS();
  renderHistory();

  const arry = JSON.parse(localStorage.getItem("searchHistory"));
  if (arry) {
    const random = Math.floor(Math.random() * arry.length);
    searchPodcast(arry[random]);
  }
  if (window.innerWidth < 1025) {
    if (localStorage.getItem("page") === "search") {
      navigationToSearch();
    } else {
      navigationToPlayer();
    }
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("./service-worker.js")
        .then((registration) => {
          console.log("Service worker registered", registration);
        })
        .catch((error) => {
          console.log("Service worker registration failed", error.message);
        });
    });
  }
});
